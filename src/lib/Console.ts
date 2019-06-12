import { AssembledOutput, SymbolTable } from "../syntax";
import { SyntaxKind } from "typescript";

export class Console{

    static log(symbolTable : SymbolTable, args : AssembledOutput[]){
        let statement = symbolTable.getIndent()+"echo ";
        for (let i = 0; i < args.length; i++) {
            let output = args[i];
            let arg = AssembledOutput.flatten(output);
            if(output.kind == SyntaxKind.Identifier){
                statement = `${statement} "$${arg}"`
            }else{
                statement = `${statement} ${arg}`
            }
          }
          return `\n${statement}\n`;
    }
}