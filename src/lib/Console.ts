import { AssembledOutput } from "../syntax";
import { SyntaxKind } from "typescript";

export class Console{

    static log(args : AssembledOutput[]){
        let statement = "echo ";
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