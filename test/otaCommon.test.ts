import crypto from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as common from '../src/lib/ota/common';

describe('OTA Common', () => {
    it.each([
        ['10005777-4.1-TRADFRI-control-outlet-2.0.022.ota.ota.signed', {
            manufacturer: 'Ikea',
            headerField: 0,
            elements: 1
        }],
        ['A60_DIM_Z3_IM003D_00103101-encrypted_11_20_2018_Tue_122925_01_withoutMF.ota', {
            manufacturer: 'Ledvance',
            headerField: 0,
            elements: 1
        }],
        ['ZLL_MK_0x01020509_CLA60_TW.ota', {
            manufacturer: 'Ledvance',
            headerField: 0,
            elements: 4
        }],
        ['ZLL_MK_0x01020510_CLASSIC_A60_RGBW.ota', {
            manufacturer: 'Ledvance',
            headerField: 0,
            elements: 6
        }],
        ['SAL2PU1_02015120_OTA.ota', {
            manufacturer: 'Salus',
            headerField: 0,
            elements: 1
        }],
        ['10F2-7B09-0000-0004-01090206-spo-fmi4.ota.zigbee', {
            manufacturer: 'Ubisys',
            headerField: 4,
            minimumHardwareVersion: 0,
            maximumHardwareVersion: 4,
            elements: 1
        }],
        ['10005778-10.1-TRADFRI-onoff-shortcut-control-2.2.010.ota.ota.signed', {
            manufacturer: '',
            headerField: 0,
            elements: 1
        }],
        ['100B-0112-01001500-ConfLightBLE-Lamps-EFR32MG13.zigbee', {
            manufacturer: '',
            headerField: 0,
            elements: 26
        }],
        ['100B-0112-01002400-ConfLightBLE-Lamps-EFR32MG13.zigbee', {
            headerField: 0,
            elements: 33
        }],
    ])("Can correctly parse OTA image file %s", (filename, meta) => {
        const data = readFileSync(join(__dirname, 'stub', 'otaImageFiles', filename));
        const start = data.indexOf(common.UPGRADE_FILE_IDENTIFIER);

        const image = common.parseImage(data.subarray(start));

        expect(common.validateImageData(image)).toBeUndefined();

        expect(image.header.otaHeaderFieldControl).toBe(meta.headerField);

        expect(image.header.minimumHardwareVersion).toBe(
            // @ts-expect-error can be undefined
            meta.minimumHardwareVersion
        );
        expect(image.header.maximumHardwareVersion).toBe(
            // @ts-expect-error can be undefined
            meta.maximumHardwareVersion
        );

        expect(image.elements.length).toBe(meta.elements);
    });

    describe('Image checksum validation', () => {
        const data = readFileSync(join(__dirname, 'stub', 'otaImageFiles', 'SAL2PU1_02015120_OTA.ota'));
        const hash = crypto.createHash('sha512');
        hash.update(data);

        const start = data.indexOf(common.UPGRADE_FILE_IDENTIFIER);
        const image = common.parseImage(data.subarray(start));

        const mockGetImageMeta = jest.fn().mockResolvedValue({
            fileVersion: image.header.fileVersion,
            sha512: hash.digest('hex'),
        });
        const device = { ieeeAddr: '0x000000000000000' };

        it('Valid OTA image file passes checksum verification', async () => {
            const mockDownloadImage = jest.fn().mockResolvedValue({ data });
            await expect(common.getNewImage(
                {
                    manufacturerCode: image.header.manufacturerCode,
                    imageType: image.header.imageType,
                    fileVersion: image.header.fileVersion - 1,
                },
                // @ts-expect-error mock
                device,
                mockGetImageMeta,
                mockDownloadImage,
                false
            )).resolves.toBeInstanceOf(Object);
        });

        it('Invalid OTA image file fails checksum verification', async () => {
            const mockDownloadImage = jest.fn().mockResolvedValue({ data: 'invalid data' });

            await expect(common.getNewImage(
                // @ts-expect-error mock
                { fileVersion: image.header.fileVersion - 1 },
                { ieeeAddr: '0x000000000000000' },
                mockGetImageMeta,
                mockDownloadImage,
                false
            )).rejects.toThrow(/File checksum validation failed/);
        });
    });

});
