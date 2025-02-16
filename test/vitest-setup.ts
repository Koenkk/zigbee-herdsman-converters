import {buildIndex} from '../src/indexer';

export async function setup() {
    await buildIndex(true);
}
