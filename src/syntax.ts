import {
    Node,
    SyntaxKind,
    OutputFileType,
    BinaryExpression
} from 'typescript';
import { GlobalTable } from './GlobalTable';
import { lookup } from 'dns';

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

    pop(){
        this.children.pop()
    }

    flattenOutput(){
        return AssembledOutput.flatten(this);
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

export enum SymbolType{ STRING="STRING",NUMBER="NUMBER" }

export class SymbolTable{

    parent : SymbolTable = null
    table = {}

    constructor(parent: SymbolTable){
        this.parent = parent;
    }

    insert(varName: string, type : SymbolType){
        if(varName==null){
            throw new Error("varName is null");
        }
        this.table[varName] = type
    }

    lookup(varName: string){

        if(this.table.hasOwnProperty(varName)){
            return this.table[varName];
        }else{
            if(this.parent == null){
                return null;
            }else{
                return this.parent.lookup(varName);
            }
        }
    }
}

export class Assemble {


    SourceFile(nodes: Node[]): string {
        let output = "";
        let symbolTable = new SymbolTable(null)
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            if (node.kind == SyntaxKind.SyntaxList) {
                output+= AssembledOutput.flatten(this.SyntaxList(symbolTable, node));
            } else if (node.kind == SyntaxKind.EndOfFileToken) {
                console.log(symbolTable)
                return output;
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
    }

    SyntaxList(symbolTable : SymbolTable, node: Node) :AssembledOutput {
        let output = new AssembledOutput(SyntaxKind.SyntaxList,"");
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.VariableStatement) {
                output.push(new AssembledOutput(SyntaxKind.VariableStatement,this.VariableStatement(symbolTable, node)));
            } else if (node.kind == SyntaxKind.ExpressionStatement) {
                output.push(new AssembledOutput(SyntaxKind.ExpressionStatement,this.ExpressionStatement(symbolTable, node)))
            } else if (node.kind == SyntaxKind.Identifier) {
                output.push(new AssembledOutput(SyntaxKind.Identifier,this.Identifier(symbolTable, node)))
            } else if (node.kind == SyntaxKind.StringLiteral) {
                output.push(this.StringLiteral(symbolTable, node))
            }  else if (node.kind == SyntaxKind.FirstLiteralToken) {
                output.push(new AssembledOutput(SyntaxKind.FirstLiteralToken,this.FirstLiteralToken(symbolTable, node)))
            }  else if (node.kind == SyntaxKind.CommaToken) {
                output.push(new AssembledOutput(SyntaxKind.CommaToken,this.CommaToken(symbolTable, node)))
            }else if (node.kind == SyntaxKind.VariableDeclaration) {
                output.push(new AssembledOutput(SyntaxKind.VariableDeclaration,this.VariableDeclaration(symbolTable, node)));
            } else if (node.kind == SyntaxKind.EndOfFileToken) {
                return output;
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    Identifier(symbolTable : SymbolTable, node: Node) :string {
        return `${node.getText()}`
    }

    StringLiteral(symbolTable : SymbolTable, node: Node) :AssembledOutput {
       return new AssembledOutput(SyntaxKind.StringLiteral,node.getText())
    }

    FirstLiteralToken(symbolTable : SymbolTable, node: Node) :string {
        return node.getText()
    }

    CommaToken(symbolTable : SymbolTable, node: Node) :string {
        return this.noop(symbolTable, node);
    }

    ExpressionStatement(symbolTable : SymbolTable, node: Node) :string {
        let output="";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.CallExpression) {
                output+=this.CallExpression(symbolTable, node)
            }else if(node.kind == SyntaxKind.SemicolonToken){
                output+=("\n");
            }else{
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    CallExpression(symbolTable : SymbolTable, node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        let fnc = null;
        let syntaxList : AssembledOutput = null;

        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if(node.kind == SyntaxKind.PropertyAccessExpression){
                fnc = this.PropertyAccessExpression(symbolTable, node);
            } else if(node.kind == SyntaxKind.OpenParenToken || node.kind == SyntaxKind.CloseParenToken){
                output+=this.noop(symbolTable, node);
            } else if(node.kind == SyntaxKind.SyntaxList){
                syntaxList = this.SyntaxList(symbolTable, node);
            }else{
                this.unhandledToken(symbolTable, node)
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

    PropertyAccessExpression(symbolTable : SymbolTable, node: Node) :any {
        if(GlobalTable.exists(node.getText())){
            return GlobalTable.get(node.getText());
        }else{
            return node.getText();
        }
    }


    VariableStatement(symbolTable : SymbolTable, node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.VariableDeclarationList) {
                output+=this.VariableDeclarationList(symbolTable, node)
            } else if (node.kind == SyntaxKind.SemicolonToken) {
                output+=("\n");
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    VariableDeclaration(symbolTable : SymbolTable, node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        let identifier = null;
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.Identifier) {
                identifier=this.Identifier(symbolTable, node)
                symbolTable.insert(identifier, SymbolType.STRING)
                output+=identifier;
            } else if (node.kind == SyntaxKind.ColonToken) {
                output+=this.noop(symbolTable, node);
            } else if (node.kind == SyntaxKind.NumberKeyword) {
                output+=this.noop(symbolTable, node);
                symbolTable.insert(identifier, SymbolType.NUMBER)
            } else if (node.kind == SyntaxKind.StringKeyword) {
                output+=this.noop(symbolTable, node);
                symbolTable.insert(identifier, SymbolType.STRING)
            } else if (node.kind == SyntaxKind.FirstAssignment) {
                output+=(node.getText())
            } else if (node.kind == SyntaxKind.FirstLiteralToken) {
                output+=(node.getText())
                symbolTable.insert(identifier, SymbolType.NUMBER)
            } else if (node.kind == SyntaxKind.StringLiteral) {
                output+=AssembledOutput.flatten(this.StringLiteral(symbolTable, node))
                symbolTable.insert(identifier, SymbolType.STRING)
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                let binExpOutput=this.BinaryExpression(symbolTable, node)
                if(binExpOutput.isNumeric){
                    symbolTable.insert(identifier, SymbolType.NUMBER)
                }else{
                    symbolTable.insert(identifier, SymbolType.STRING)
                }
                output+=binExpOutput.flattenOutput();
            } else if (node.kind == SyntaxKind.ParenthesizedExpression) {
                let parenExpOutput=this.ParenthesizedExpression(symbolTable, node)
                if(parenExpOutput.isNumeric){
                    symbolTable.insert(identifier, SymbolType.NUMBER)
                }else{
                    symbolTable.insert(identifier, SymbolType.STRING)
                }
                output+=parenExpOutput.flattenOutput();
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        output+=("\n")
        return output;
    }

    ParenthesizedExpression(symbolTable : SymbolTable, node: Node) :AssembledOutput {
        
        let assembledOutput = new AssembledOutput(SyntaxKind.ParenthesizedExpression,''); 
        let binaryExpOut : AssembledOutput= null;        
        let childNodes = node.getChildren();
        let openParen = null;
        let closeParen = null;
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.OpenParenToken) {
                openParen = (this.OpenParenToken(symbolTable,node))
            } else if (node.kind == SyntaxKind.CloseParenToken) {
               closeParen = (this.CloseParenToken(symbolTable,node))
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                binaryExpOut = this.BinaryExpression(symbolTable, node);
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }

        assembledOutput.isNumeric = binaryExpOut.isNumeric;

        if(binaryExpOut.isNumeric){
            assembledOutput.push(openParen)
            assembledOutput.push(binaryExpOut);
            assembledOutput.push(closeParen);
        }else{
            //no parenthesis for string operations
            assembledOutput.push(binaryExpOut);
        }

        return assembledOutput;
    }

    OpenParenToken(symbolTable : SymbolTable, node: Node) :AssembledOutput {
       return new AssembledOutput(SyntaxKind.OpenParenToken,"(");
    }

    CloseParenToken(symbolTable : SymbolTable, node: Node) :AssembledOutput {
        return new AssembledOutput(SyntaxKind.CloseParenToken,")");
     }

    BinaryExpression(symbolTable : SymbolTable, node: Node) :AssembledOutput {

        let assembledOutput = new AssembledOutput(SyntaxKind.BinaryExpression,"");
        let operator = "";
        let operands=[]
        let hasStringLiteral = false;
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.Identifier) {
                if(symbolTable.lookup(node.getText())==SymbolType.STRING){
                    hasStringLiteral = true;
                }
                operands.push("$"+this.Identifier(symbolTable, node))
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
                let parenOutput = this.ParenthesizedExpression(symbolTable, node)
                if(!parenOutput.isNumeric){
                    hasStringLiteral = true;
                }
                operands.push(parenOutput.flattenOutput())
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }

        let openParen = "$(("
        let closeParen = "))"
        if(hasStringLiteral){
            operator=""
            openParen = ""
            closeParen = ""
            assembledOutput.isNumeric = false;

        }else{
            assembledOutput.isNumeric = true;
            operator=` ${operator} `;
        }
        assembledOutput.output = openParen+operands[0]+operator+operands[1]+closeParen;

        return assembledOutput;
    }

    VariableDeclarationList(symbolTable : SymbolTable, node: Node) :string {
        let output = "";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.LetKeyword) {
               output += this.LetKeyword(symbolTable, node)
            } else if (node.kind == SyntaxKind.SyntaxList) {
                output += AssembledOutput.flatten(this.SyntaxList(symbolTable, node))
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    LetKeyword(symbolTable : SymbolTable, node: Node) :string {
        return this.noop(symbolTable, node)
    }

    unhandledToken(symbolTable : SymbolTable, node: Node) :string {
        throw new Error("Unhandled token type: " + this.d(node));
    }

    noop(symbolTable : SymbolTable, node: Node) :string {
        console.debug("noop: " + this.d(node))
        return ""
    }

    d(node: Node) {
        return SyntaxKind[node.kind] + " " + node.getText();
    }

}