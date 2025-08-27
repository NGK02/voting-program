import { renderVisitor } from '@codama/renderers-js';
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor'
import anchorIdl from './target/idl/voting_program.json';

const rootNode = rootNodeFromAnchor(anchorIdl);
const codama = createFromRoot(rootNode);
console.log(codama.getRoot());
codama.accept(renderVisitor('clients/js/src/generated'));