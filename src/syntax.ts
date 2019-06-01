import {
    Node,
    SyntaxKind,
    OutputFileType,
    BinaryExpression
} from 'typescript';
import { GlobalTable } from './GlobalTable';

export class AssembledOutput{
    kind : SyntaxKind = null
    isNumeric: boolean = false
    output: string = ""
    children : AssembledOutput[] = []

    constructor(kind:SyntaxKind,output:string){
        this.kind = kind
        this.output = output
    }

    push(assembledOutput: AssembledOutput){
        this.children.push(assembledOutput);
    }

    static flatten(assembledOutput: AssembledOutput) :string{
        let output = assembledOutput.output;
        for(let i=0;i<assembledOutput.children.length;i++){
            let child = assembledOutput.children[i]
            output+=this.flatten(child)
        }
        return output;
    }
}

export class Assemble {


    SourceFile(nodes: Node[]): string {
        let output = "";
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            if (node.kind == SyntaxKind.SyntaxList) {
                output+= AssembledOutput.flatten(this.SyntaxList(node));
            } else if (node.kind == SyntaxKind.EndOfFileToken) {
                return output;
            } else {
                this.unhandledToken(node)
            }
        }
    }

    SyntaxList(node: Node) :AssembledOutput {
        let output = new AssembledOutput(SyntaxKind.SyntaxList,"");
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.VariableStatement) {
                output.push(new AssembledOutput(SyntaxKind.VariableStatement,this.VariableStatement(node)));
            } else if (node.kind == SyntaxKind.ExpressionStatement) {
                output.push(new AssembledOutput(SyntaxKind.ExpressionStatement,this.ExpressionStatement(node)))
            } else if (node.kind == SyntaxKind.Identifier) {
                output.push(new AssembledOutput(SyntaxKind.Identifier,this.Identifier(node)))
            } else if (node.kind == SyntaxKind.StringLiteral) {
                output.push(this.StringLiteral(node))
            }  else if (node.kind == SyntaxKind.FirstLiteralToken) {
                output.push(new AssembledOutput(SyntaxKind.FirstLiteralToken,this.FirstLiteralToken(node)))
            }  else if (node.kind == SyntaxKind.CommaToken) {
                output.push(new AssembledOutput(SyntaxKind.CommaToken,this.CommaToken(node)))
            }else if (node.kind == SyntaxKind.VariableDeclaration) {
                output.push(new AssembledOutput(SyntaxKind.VariableDeclaration,this.VariableDeclaration(node)));
            } else if (node.kind == SyntaxKind.EndOfFileToken) {
                return output;
            } else {
                this.unhandledToken(node)
            }
        }
        return output;
    }

    Identifier(node: Node) :string {
        return `${node.getText()}`
    }

    StringLiteral(node: Node) :AssembledOutput {
       return new AssembledOutput(SyntaxKind.StringLiteral,node.getText())
    }

    FirstLiteralToken(node: Node) :string {
        return node.getText()
    }

    CommaToken(node: Node) :string {
        return this.noop(node);
    }

    ExpressionStatement(node: Node) :string {
        let output="";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.CallExpression) {
                output+=this.CallExpression(node)
            }else if(node.kind == SyntaxKind.SemicolonToken){
                output+=("\n");
            }else{
                this.unhandledToken(node)
            }
        }
        return output;
    }

    CallExpression(node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        let fnc = null;
        let syntaxList : AssembledOutput = null;

        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if(node.kind == SyntaxKind.PropertyAccessExpression){
                fnc = this.PropertyAccessExpression(node);
            } else if(node.kind == SyntaxKind.OpenParenToken || node.kind == SyntaxKind.CloseParenToken){
                output+=this.noop(node);
            } else if(node.kind == SyntaxKind.SyntaxList){
                syntaxList = this.SyntaxList(node);
            }else{
                this.unhandledToken(node)
            }
        }

        let params = []
        for(let i=0;syntaxList!=null && i<syntaxList.children.length;i++){
            let child = syntaxList.children[i];
            if(child.kind!=SyntaxKind.CommaToken){
                params.push(child)
            }
        }

       if(typeof fnc === 'function'){
           output = fnc(params)
       }

        return output;
    }

    PropertyAccessExpression(node: Node) :any {
        if(GlobalTable.exists(node.getText())){
            return GlobalTable.get(node.getText());
        }else{
            return node.getText();
        }
    }


    VariableStatement(node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.VariableDeclarationList) {
                output+=this.VariableDeclarationList(node)
            } else if (node.kind == SyntaxKind.SemicolonToken) {
                output+=("\n");
            } else {
                this.unhandledToken(node)
            }
        }
        return output;
    }

    VariableDeclaration(node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.Identifier) {
                output+=this.Identifier(node)
            } else if (node.kind == SyntaxKind.ColonToken) {
                output+=this.noop(node);
            } else if (node.kind == SyntaxKind.NumberKeyword) {
                output+=this.noop(node);
            } else if (node.kind == SyntaxKind.FirstAssignment) {
                output+=(node.getText())
            } else if (node.kind == SyntaxKind.FirstLiteralToken) {
                output+=(node.getText())
            } else if (node.kind == SyntaxKind.StringLiteral) {
                output+=AssembledOutput.flatten(this.StringLiteral(node))
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                output+=this.BinaryExpression(node)
            } else if (node.kind == SyntaxKind.ParenthesizedExpression) {
                output+=this.ParenthesizedExpression(node)
            } else {
                this.unhandledToken(node)
            }
        }
        output+=("\n")
        return output;
    }

    ParenthesizedExpression(node: Node) :string {
        let output = "";
        
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.OpenParenToken) {
                output+=("(")
            } else if (node.kind == SyntaxKind.CloseParenToken) {
                output+=(")")
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                output+=this.BinaryExpression(node);
            } else {
                this.unhandledToken(node)
            }
        }
        return output;
    }

    BinaryExpression(node: Node) :string {
        (node as BinaryExpression).operatorToken.kind
        let operator = "";
        let operands=[]
        let hasStringLiteral = false;
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.Identifier) {
                operands.push("$"+this.Identifier(node))
            } else if (node.kind == SyntaxKind.FirstLiteralToken) {
                operands.push(node.getText())
            }else if (node.kind == SyntaxKind.StringLiteral) {
                operands.push(node.getText())
                hasStringLiteral = true;
            } else if (node.kind == SyntaxKind.PlusToken 
                || node.kind == SyntaxKind.AsteriskToken
                || node.kind == SyntaxKind.MinusToken
                || node.kind == SyntaxKind.SlashToken) {
                    operator = node.getText()
            } else if (node.kind == SyntaxKind.ParenthesizedExpression) {
                operands.push(this.ParenthesizedExpression(node))
            } else {
                this.unhandledToken(node)
            }
        }

        let openParen = "$(("
        let closeParen = "))"
        if(hasStringLiteral){
            operator=""
            openParen = ""
            closeParen = ""

        }else{
            operator=` ${operator} `;
        }
        return openParen+operands[0]+operator+operands[1]+closeParen;
    }

    VariableDeclarationList(node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.LetKeyword) {
               output += this.LetKeyword(node)
            } else if (node.kind == SyntaxKind.SyntaxList) {
                output += AssembledOutput.flatten(this.SyntaxList(node))
            } else {
                this.unhandledToken(node)
            }
        }
        return output;
    }

    LetKeyword(node: Node) :string {
        return this.noop(node)
    }

    unhandledToken(node: Node) :string {
        throw new Error("Unhandled token type: " + this.d(node));
    }

    noop(node: Node) :string {
        console.debug("noop: " + this.d(node))
        return ""
    }

    d(node: Node) {
        return SyntaxKind[node.kind] + " " + node.getText();
    }

}