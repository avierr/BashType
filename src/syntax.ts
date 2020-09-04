import {Node, SyntaxKind} from 'typescript';
import {GlobalTable} from './GlobalTable';

export class AssembledOutput {
    kind: SyntaxKind = null;
    isNumeric: boolean = false;
    output: string = "";
    children: AssembledOutput[] = [];

    constructor(kind: SyntaxKind, output: string) {
        this.kind = kind;
        this.output = output
    }

    push(assembledOutput: AssembledOutput) {
        this.children.push(assembledOutput);
    }

    pop(): AssembledOutput {
        return this.children.pop()
    }

    hasChildren(): boolean {
        return this.children.length > 0;
    }

    peek(): AssembledOutput {
        return this.children[this.children.length - 1]
    }

    flattenOutput() {
        return AssembledOutput.flatten(this);
    }

    static flatten(assembledOutput: AssembledOutput): string {
        let output = assembledOutput.output;
        for (let i = 0; i < assembledOutput.children.length; i++) {
            let child = assembledOutput.children[i];
            output += this.flatten(child)
        }
        return output;
    }
}

export enum SymbolType { STRING = "STRING", NUMBER = "NUMBER" }

export class SymbolTable {

    parent: SymbolTable = null;
    table = {};

    constructor(parent: SymbolTable) {
        this.parent = parent;
    }

    insert(varName: string, type: SymbolType) {
        if (varName == null) {
            throw new Error("varName is null");
        }
        this.table[varName] = type
    }

    lookupInHigherScope(varName: string) {
        if (this.parent == null) {
            return "__bt";
        } else {
            return this.lookup(varName);
        }
    }

    lookup(varName: string) {

        if (this.table.hasOwnProperty(varName)) {
            return this.table[varName];
        } else {
            if (this.parent == null) {
                return null;
            } else {
                return this.parent.lookup(varName);
            }
        }
    }

    getIndent(indent = "") {
        if (this.parent == null) {
            return indent;
        } else {
            return this.parent.getIndent(indent + "  ");
        }
    }
}

export class Assemble {


    SourceFile(nodes: Node[]): string {
        let output = "";
        let symbolTable = new SymbolTable(null);
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            if (node.kind == SyntaxKind.SyntaxList) {
                output += AssembledOutput.flatten(this.SyntaxList(symbolTable, node));
            } else if (node.kind == SyntaxKind.EndOfFileToken) {
                console.log(symbolTable);
                return output;
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
    }

    SyntaxList(symbolTable: SymbolTable, node: Node): AssembledOutput {
        let output = new AssembledOutput(SyntaxKind.SyntaxList, "");
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.VariableStatement) {
                output.push(new AssembledOutput(SyntaxKind.VariableStatement, this.VariableStatement(symbolTable, node)));
            } else if (node.kind == SyntaxKind.IfStatement) {
                output.push(this.IfStatement(symbolTable, node))
            } else if (node.kind == SyntaxKind.WhileStatement) {
                output.push(this.WhileStatement(symbolTable, node))
            } else if (node.kind == SyntaxKind.ExpressionStatement) {
                output.push(new AssembledOutput(SyntaxKind.ExpressionStatement, this.ExpressionStatement(symbolTable, node)))
            } else if (node.kind == SyntaxKind.Identifier) {
                output.push(new AssembledOutput(SyntaxKind.Identifier, this.Identifier(symbolTable, node)))
            } else if (node.kind == SyntaxKind.StringLiteral) {
                output.push(this.StringLiteral(symbolTable, node))
            } else if (node.kind == SyntaxKind.FirstLiteralToken) {
                output.push(this.FirstLiteralToken(symbolTable, node))
            } else if (node.kind == SyntaxKind.CommaToken) {
                output.push(new AssembledOutput(SyntaxKind.CommaToken, this.CommaToken(symbolTable, node)))
            } else if (node.kind == SyntaxKind.VariableDeclaration) {
                output.push(new AssembledOutput(SyntaxKind.VariableDeclaration, this.VariableDeclaration(symbolTable, node)));
            } else if (node.kind == SyntaxKind.EndOfFileToken) {
                return output;
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    IdentifierAccess(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.Identifier, "$" + node.getText())
    }

    IdentifierFromIdentifierAccess(outputNode: AssembledOutput): AssembledOutput {
        if (outputNode.kind != SyntaxKind.Identifier || outputNode.output[0] != "$") {
            throw new Error("Cannot convert a non-(IdentifierAccess) type to an identifier");
        }
        outputNode.output = outputNode.output.substr(1);
        return outputNode;
    }

    Identifier(symbolTable: SymbolTable, node: Node): string {
        return `${node.getText()}`
    }

    TrueKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.Identifier, "1")
    }

    FalseKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.Identifier, "0")
    }

    StringLiteral(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.StringLiteral, node.getText())
    }

    FirstLiteralToken(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.StringLiteral, node.getText())
    }

    CommaToken(symbolTable: SymbolTable, node: Node): string {
        return this.noop(symbolTable, node);
    }

    WhileStatement(symbolTable: SymbolTable, parent: Node): AssembledOutput {
        let assembledOutput = new AssembledOutput(SyntaxKind.ParenthesizedExpression, '');
        let childNodes = parent.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.WhileKeyword) {
                assembledOutput.push(this.WhileKeyword(symbolTable, node))
            } else if (node.kind == SyntaxKind.IfStatement) {
                assembledOutput.push(this.WhileStatement(symbolTable, node));
            } else if (node.kind == SyntaxKind.OpenParenToken) {
                assembledOutput.push(this.ConditionOpenParenToken(symbolTable, node))
            } else if (node.kind == SyntaxKind.CloseParenToken) {
                assembledOutput.push(this.ConditionCloseParenToken(symbolTable, node));
                assembledOutput.push(this.DoStatement(symbolTable, node))
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                assembledOutput.push(this.BinaryExpression(symbolTable, node));
            } else if (node.kind == SyntaxKind.PrefixUnaryExpression) {
                assembledOutput.push(this.PrefixUnaryExpression(symbolTable, node));
            } else if (node.kind == SyntaxKind.Identifier) {
                assembledOutput.push(this.IdentifierAccess(symbolTable, node));
            } else if (node.kind == SyntaxKind.Block) {
                assembledOutput.push(this.Block(symbolTable, node));
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }

        assembledOutput.push(this.DoneKeyword(symbolTable, parent));
        return assembledOutput;
    }

    IfStatement(symbolTable: SymbolTable, parent: Node): AssembledOutput {
        let assembledOutput = new AssembledOutput(SyntaxKind.ParenthesizedExpression, '');
        let childNodes = parent.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.IfKeyword) {
                assembledOutput.push(this.IfKeyword(symbolTable, node))
            } else if (node.kind == SyntaxKind.IfStatement) {
                assembledOutput.push(this.IfStatement(symbolTable, node));
            } else if (node.kind == SyntaxKind.OpenParenToken) {
                assembledOutput.push(this.ConditionOpenParenToken(symbolTable, node))
            } else if (node.kind == SyntaxKind.CloseParenToken) {
                assembledOutput.push(this.ConditionCloseParenToken(symbolTable, node));
                assembledOutput.push(this.ThenStatement(symbolTable, node))
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                assembledOutput.push(this.BinaryExpression(symbolTable, node));
            } else if (node.kind == SyntaxKind.PrefixUnaryExpression) {
                assembledOutput.push(this.PrefixUnaryExpression(symbolTable, node));
            } else if (node.kind == SyntaxKind.Identifier) {
                assembledOutput.push(this.IdentifierAccess(symbolTable, node));
            } else if (node.kind == SyntaxKind.Block) {
                assembledOutput.push(this.Block(symbolTable, node));
            } else if (node.kind == SyntaxKind.ElseKeyword) {
                assembledOutput.push(this.ElseKeyword(symbolTable, node));

            } else {
                this.unhandledToken(symbolTable, node)
            }
        }

        assembledOutput.push(this.FiKeyword(symbolTable, parent));
        return assembledOutput;
    }


    Block(symbolTable: SymbolTable, parent: Node): AssembledOutput {
        let blockSymbolTable = new SymbolTable(symbolTable);
        let assembledOutput = new AssembledOutput(SyntaxKind.Block, "");
        let childNodes = parent.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.FirstPunctuation || node.kind == SyntaxKind.CloseBraceToken) {
                this.noop(blockSymbolTable, node);
            } else if (node.kind == SyntaxKind.SyntaxList) {
                assembledOutput.push(this.SyntaxList(blockSymbolTable, node))
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return assembledOutput;

    }


    DoneKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.CloseBracketToken, "\n" + symbolTable.getIndent() + "done\n")
    }

    FiKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.CloseBracketToken, "\n" + symbolTable.getIndent() + "fi\n")
    }

    WhileKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.IfKeyword, symbolTable.getIndent() + node.getText() + " ")
    }

    IfKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.IfKeyword, symbolTable.getIndent() + node.getText() + " ")
    }

    ElseKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.ElseKeyword, "\n" + symbolTable.getIndent() + "else\n")
    }

    ExclamationToken(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.ExclamationToken, " ! ")
    }

    DoStatement(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.StringLiteral, "; do \n")
    }

    ThenStatement(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.StringLiteral, "; then \n")
    }


    ExpressionStatement(symbolTable: SymbolTable, node: Node): string {
        let output = "" + symbolTable.getIndent();
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.CallExpression) {
                output += this.CallExpression(symbolTable, node)
            } else if (node.kind == SyntaxKind.SemicolonToken) {
                output += ("\n");
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                output += this.BinaryExpression(symbolTable, node).flattenOutput()
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    CallExpression(symbolTable: SymbolTable, node: Node): string {
        let output = "";
        let childNodes = node.getChildren();
        let fnc = null;
        let syntaxList: AssembledOutput = null;

        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.PropertyAccessExpression) {
                fnc = this.PropertyAccessExpression(symbolTable, node);
            } else if (node.kind == SyntaxKind.OpenParenToken || node.kind == SyntaxKind.CloseParenToken) {
                output += this.noop(symbolTable, node);
            } else if (node.kind == SyntaxKind.SyntaxList) {
                syntaxList = this.SyntaxList(symbolTable, node);
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }

        let params = [];
        for (let i = 0; syntaxList != null && i < syntaxList.children.length; i++) {
            let child = syntaxList.children[i];
            if (child.kind != SyntaxKind.CommaToken) {
                params.push(child)
            }
        }

        if (typeof fnc === 'function') {
            output = fnc(symbolTable, params)
        }

        return output;
    }

    PropertyAccessExpression(symbolTable: SymbolTable, node: Node): any {
        if (GlobalTable.exists(node.getText())) {
            return GlobalTable.get(node.getText());
        } else {
            return node.getText();
        }
    }


    VariableStatement(symbolTable: SymbolTable, node: Node): string {
        let output = "";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.VariableDeclarationList) {
                output += this.VariableDeclarationList(symbolTable, node)
            } else if (node.kind == SyntaxKind.SemicolonToken) {
                output += ("\n");
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    VariableDeclaration(symbolTable: SymbolTable, node: Node): string {
        let output = "";
        let childNodes = node.getChildren();
        let identifier = null;
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.Identifier) {
                identifier = this.Identifier(symbolTable, node);
                symbolTable.insert(identifier, SymbolType.STRING);
                output += identifier;
            } else if (node.kind == SyntaxKind.ColonToken) {
                output += this.noop(symbolTable, node);
            } else if (node.kind == SyntaxKind.NumberKeyword) {
                output += this.noop(symbolTable, node);
                symbolTable.insert(identifier, SymbolType.NUMBER)
            } else if (node.kind == SyntaxKind.AnyKeyword) {
                output += this.noop(symbolTable, node);
                symbolTable.insert(identifier, SymbolType.NUMBER)
            } else if (node.kind == SyntaxKind.TrueKeyword) {
                output += this.TrueKeyword(symbolTable, node).flattenOutput();
                symbolTable.insert(identifier, SymbolType.NUMBER)
            } else if (node.kind == SyntaxKind.FalseKeyword) {
                output += this.FalseKeyword(symbolTable, node).flattenOutput();
                symbolTable.insert(identifier, SymbolType.NUMBER)
            } else if (node.kind == SyntaxKind.StringKeyword) {
                output += this.noop(symbolTable, node);
                symbolTable.insert(identifier, SymbolType.STRING)
            } else if (node.kind == SyntaxKind.FirstAssignment) {
                output += (node.getText())
            } else if (node.kind == SyntaxKind.FirstLiteralToken) {
                output += (node.getText());
                symbolTable.insert(identifier, SymbolType.NUMBER)
            } else if (node.kind == SyntaxKind.StringLiteral) {
                output += AssembledOutput.flatten(this.StringLiteral(symbolTable, node));
                symbolTable.insert(identifier, SymbolType.STRING)
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                let binExpOutput = this.BinaryExpression(symbolTable, node);
                if (binExpOutput.isNumeric) {
                    symbolTable.insert(identifier, SymbolType.NUMBER)
                } else {
                    symbolTable.insert(identifier, SymbolType.STRING)
                }
                output += binExpOutput.flattenOutput();
            } else if (node.kind == SyntaxKind.ParenthesizedExpression) {
                let parenExpOutput = this.ParenthesizedExpression(symbolTable, node);
                if (parenExpOutput.isNumeric) {
                    symbolTable.insert(identifier, SymbolType.NUMBER)
                } else {
                    symbolTable.insert(identifier, SymbolType.STRING)
                }
                output += parenExpOutput.flattenOutput();
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        output += ("\n");
        return output;
    }

    ParenthesizedExpression(symbolTable: SymbolTable, node: Node): AssembledOutput {

        let assembledOutput = new AssembledOutput(SyntaxKind.ParenthesizedExpression, '');
        let binaryExpOut: AssembledOutput = null;
        let childNodes = node.getChildren();
        let openParen = null;
        let closeParen = null;
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.OpenParenToken) {
                openParen = (this.OpenParenToken(symbolTable, node))
            } else if (node.kind == SyntaxKind.CloseParenToken) {
                closeParen = (this.CloseParenToken(symbolTable, node))
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                binaryExpOut = this.BinaryExpression(symbolTable, node);
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }

        assembledOutput.isNumeric = binaryExpOut.isNumeric;

        if (binaryExpOut.isNumeric) {
            assembledOutput.push(openParen);
            assembledOutput.push(binaryExpOut);
            assembledOutput.push(closeParen);
        } else {
            //no parenthesis for string operations
            assembledOutput.push(binaryExpOut);
        }

        return assembledOutput;
    }

    ConditionOpenParenToken(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.OpenParenToken, " ((  ");
    }

    ConditionCloseParenToken(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.OpenParenToken, " )) ");
    }

    OpenParenToken(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.OpenParenToken, "(");
    }

    CloseParenToken(symbolTable: SymbolTable, node: Node): AssembledOutput {
        return new AssembledOutput(SyntaxKind.CloseParenToken, ")");
    }


    PrefixUnaryExpression(symbolTable: SymbolTable, node: Node): AssembledOutput {
        let assembledOutput = new AssembledOutput(SyntaxKind.BinaryExpression, "");
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.ExclamationToken) {
                assembledOutput.push(this.ExclamationToken(symbolTable, node))
            } else if (node.kind == SyntaxKind.Identifier) {
                assembledOutput.push(this.IdentifierAccess(symbolTable, node))
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return assembledOutput;
    }

    BinaryExpression(symbolTable: SymbolTable, node: Node): AssembledOutput {

        let assembledOutput = new AssembledOutput(SyntaxKind.BinaryExpression, "");
        let operator = "";
        let operands: AssembledOutput[] = [];
        let hasStringLiteral = false;
        let isAssignment = false;
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.Identifier) {
                if (symbolTable.lookup(node.getText()) == SymbolType.STRING) {
                    hasStringLiteral = true;
                }
                operands.push(this.IdentifierAccess(symbolTable, node))
            } else if (node.kind == SyntaxKind.FirstLiteralToken) {
                operands.push(this.FirstLiteralToken(symbolTable, node))
            } else if (node.kind == SyntaxKind.TrueKeyword) {
                operands.push(this.TrueKeyword(symbolTable, node))
            } else if (node.kind == SyntaxKind.FalseKeyword) {
                operands.push(this.FalseKeyword(symbolTable, node))
            } else if (node.kind == SyntaxKind.StringLiteral) {
                operands.push(this.StringLiteral(symbolTable, node));
                hasStringLiteral = true;
            } else if (node.kind == SyntaxKind.PlusToken
                || node.kind == SyntaxKind.AsteriskToken
                || node.kind == SyntaxKind.MinusToken
                || node.kind == SyntaxKind.SlashToken
                || node.kind == SyntaxKind.EqualsEqualsToken
                || node.kind == SyntaxKind.EqualsEqualsEqualsToken
                || node.kind == SyntaxKind.GreaterThanToken
                || node.kind == SyntaxKind.AmpersandAmpersandToken
                || node.kind == SyntaxKind.BarBarToken
                || node.kind == SyntaxKind.FirstBinaryOperator) {
                operator = node.getText();
                if (operator == "===") {
                    operator = "=="
                }
            } else if (node.kind == SyntaxKind.FirstAssignment) {
                operator = node.getText();
                isAssignment = true;
            } else if (node.kind == SyntaxKind.BinaryExpression) {
                let binExpOutput = this.BinaryExpression(symbolTable, node);
                if (!binExpOutput.isNumeric) {
                    hasStringLiteral = true;
                }
                operands.push(binExpOutput)
            } else if (node.kind == SyntaxKind.ParenthesizedExpression) {
                let parenOutput = this.ParenthesizedExpression(symbolTable, node);
                if (!parenOutput.isNumeric) {
                    hasStringLiteral = true;
                }
                operands.push(parenOutput)
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }

        let openParen = "$((";
        let closeParen = "))";

        if (hasStringLiteral || isAssignment) {

            //is this a concat operation?
            if (isAssignment == false && hasStringLiteral == true) {
                operator = ""
            }
            openParen = "";
            closeParen = "";
            assembledOutput.isNumeric = false;

            let removeParensIfNumeric = function (operand: AssembledOutput) {
                if (operand.isNumeric && operand.hasChildren() && operand.peek().kind == SyntaxKind.CloseParenToken) {
                    operand.pop(); //remove ")"
                    let val = operand.pop(); //get value
                    operand.pop(); // remove "("
                    operand.push(val);
                }
                return operand;
            };

            operands[0] = removeParensIfNumeric(operands[0]);
            operands[1] = removeParensIfNumeric(operands[1]);

            //a=4 and not $a=4
            if (isAssignment && operands[0].kind == SyntaxKind.Identifier) {
                operands[0] = this.IdentifierFromIdentifierAccess(operands[0])
            }

            // if(operands[0].isNumeric && operands[0].peek().kind == SyntaxKind.CloseParenToken){
            //     operands[0].pop(); //remove ")"
            //     let val = operands[0].pop(); //get value
            //     operands[0].pop(); // remove "("
            //     operands[0].push(val);
            // }

        } else {
            assembledOutput.isNumeric = true;
            operator = ` ${operator} `;
        }
        assembledOutput.output = openParen + operands[0].flattenOutput() + operator + operands[1].flattenOutput() + closeParen;
        return assembledOutput;
    }

    VariableDeclarationList(symbolTable: SymbolTable, node: Node): string {
        let output = "";
        let childNodes = node.getChildren();
        for (let i = 0; i < childNodes.length; i++) {
            let node = childNodes[i];
            if (node.kind == SyntaxKind.LetKeyword || node.kind == SyntaxKind.VarKeyword) {
                output += this.LetKeyword(symbolTable, node).flattenOutput()
            } else if (node.kind == SyntaxKind.SyntaxList) {
                output += AssembledOutput.flatten(this.SyntaxList(symbolTable, node))
            } else {
                this.unhandledToken(symbolTable, node)
            }
        }
        return output;
    }

    LetKeyword(symbolTable: SymbolTable, node: Node): AssembledOutput {
        if (symbolTable.parent != null) {
            return new AssembledOutput(SyntaxKind.LetKeyword, "\n"+symbolTable.getIndent() + "");
        } else {
            return new AssembledOutput(SyntaxKind.LetKeyword, "\n"+symbolTable.getIndent() + "");
        }
    }

    unhandledToken(symbolTable: SymbolTable, node: Node): string {
        throw new Error("Unhandled token type: " + this.d(node));
    }

    noop(symbolTable: SymbolTable, node: Node): string {
        console.debug("noop: " + this.d(node));
        return ""
    }

    d(node: Node) {
        return SyntaxKind[node.kind] + " " + node.getText();
    }

}