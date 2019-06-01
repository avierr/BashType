import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
import {Assemble} from './syntax';
import {Console} from './lib/Console'
import { GlobalTable } from './GlobalTable';
import * as program from 'commander'
import * as fs from 'fs'

GlobalTable.registerClass(Console);

let code = `
 let a :number =1 
 let b=1;
 let c = (a+(b*2));
 console.log(c,"d",1);
`


program.version("0.1")
        .option("-i, --input <file>", "input file(.js/.ts) path")
        .option("-o, --output","output file path")

program.parse(process.argv);

if(!program.input){
  console.error("-i input .js/.ts file path not defined");
  process.exit(1);
}else{
  code = fs.readFileSync(program.input.toString()).toString()
}

let outputPath = "";
if(!program.output){
  outputPath = program.input.toString()+".sh";
}else{
  outputPath = program.input.toString()
}



export function delint0(sourceFile: ts.SourceFile) {
  delintNode0("", sourceFile);

  function delintNode0(space: string, node: ts.Node) {
    console.log(space + SyntaxKind[node.kind]+" "+node.getText());

    node.getChildren().map(child => {
      delintNode0(space + "-", child);
    })
  }
}

export function transpile(node: ts.SourceFile) {

    if (SyntaxKind.SourceFile == node.kind) {
      let assemble = new Assemble();
      let output = assemble.SourceFile(node.getChildren());
      console.log(output)
    }

  
}

const printer: ts.Printer = ts.createPrinter();

const sourceFile: ts.SourceFile = ts.createSourceFile(
  'test.ts', code, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS
);

delint0(sourceFile);

transpile(sourceFile);