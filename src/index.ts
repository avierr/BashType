import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
import {Assemble} from './syntax';
import {Console} from './lib/Console'
import { GlobalTable } from './GlobalTable';

GlobalTable.registerClass(Console);

let code = `
 let a :number =1 
 let b=1;
 let c = (a+(b*2));
 console.log(c,"d",1);
`


export function delint0(sourceFile: ts.SourceFile) {
  delintNode0("", sourceFile);

  function delintNode0(space: string, node: ts.Node) {
    console.log(space + `(${space.length}) ` +SyntaxKind[node.kind]+" "+node.getText());

    node.getChildren().map(child => {
      let sp = space + "-"
      delintNode0(sp, child);
    })
  }
}

function transpile(node: ts.SourceFile) {

    if (SyntaxKind.SourceFile == node.kind) {
      let assemble = new Assemble();
      let output = assemble.SourceFile(node.getChildren());
      console.log(output)
      return output;
    }

  
}

const sourceFile: ts.SourceFile = ts.createSourceFile(
  'test.ts', code, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS
);

delint0(sourceFile);

transpile(sourceFile);

let BashType = {
  transpile: function (source : string) {
    const sourceFile: ts.SourceFile = ts.createSourceFile(
        'input.ts', source, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS
    );
    delint0(sourceFile);
    return transpile(sourceFile);
  }
};


export default BashType;
