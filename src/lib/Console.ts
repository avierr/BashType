import {AssembledOutput, SymbolTable} from "../syntax";
import {SyntaxKind} from "typescript";

export class Console {

    static log(symbolTable: SymbolTable, args: AssembledOutput[]) {
        let statement = symbolTable.getIndent() + "echo ";
        return Console.addArgs(args, statement);
    }

    static printf(symbolTable: SymbolTable, args: AssembledOutput[]) {
        let statement = symbolTable.getIndent() + "printf ";
        return Console.addArgs(args, statement);
    }

    //adapted from: https://github.com/nathanstilwell/color-logger
    static richPrint(symbolTable: SymbolTable, args: AssembledOutput[]) {
        let escape = '\\033[';
        let reset = `${escape}0m`;
        let treatment = `${escape}`;
        let text = args[0];
        let formatAdditions = Console.getFormatInstruction(args[1].flattenOutput())
        let fontColors = (Console.getTextColor(args[2].flattenOutput()))
        formatAdditions = formatAdditions.concat(fontColors)
        formatAdditions = formatAdditions.concat(Console.getBgColor(args[3].flattenOutput()))
        treatment = `"${treatment}${formatAdditions.join(";")}m%s${reset}"`
        if (text.kind == SyntaxKind.Identifier) {
            treatment = `${treatment} "$${text.flattenOutput()}"`
        } else {
            treatment = `${treatment} ${text.flattenOutput()}`
        }
        let statement = symbolTable.getIndent() + "printf " + treatment;
        return `\n${statement}\n`;
    }

    static getTextColor(text) {
        text = text.replaceAll("\"","'");
        text = text.replaceAll("'","");
        text = text.replaceAll("`","");
        let possibleColors  = []
        let possibleTextColor = Console.textColors[text];
        if (typeof possibleTextColor != 'undefined') {
             possibleColors.push(possibleTextColor);
        }
        return possibleColors;
    }


    static getBgColor(text) {
        text = text.replaceAll("\"","'");
        text = text.replaceAll("'","");
        text = text.replaceAll("`","");
        let possibleColors  = []
        let possibleBackgroundColor = Console.backgroundColors[text];
        if (typeof possibleBackgroundColor != 'undefined') {
            possibleColors.push(possibleBackgroundColor);
        }
        return possibleColors;
    }

    static getFormatInstruction(text) {
        text = text.replaceAll("\"","'");
        text = text.replaceAll("'","");
        text = text.replaceAll("`","");

        let formats = text.split(";");
        let outputFormats = [];
        formats.map((format)=>{
            let possibleEmphasis = Console.emphasis[format.trim()];
            if (typeof possibleEmphasis != 'undefined') {
                outputFormats.push(possibleEmphasis)
            }
        })
        return outputFormats
    }

    private static addArgs(args: AssembledOutput[], statement: string) {
        for (let i = 0; i < args.length; i++) {
            let output = args[i];
            let arg = AssembledOutput.flatten(output);
            if (output.kind == SyntaxKind.Identifier) {
                statement = `${statement} "$${arg}"`
            } else {
                statement = `${statement} ${arg}`
            }
        }
        return `\n${statement}\n`;
    }

    static textColors = {
        default: "39",
        black: "30",
        red: "31",
        green: "32",
        yellow: "33",
        blue: "34",
        purple: "35",
        cyan: "36",
        white: "37",
        bright_red: "91",
        bright_green: "92",
        bright_yellow: "93",
        bright_blue: "94",
        bright_purple: "95",
        bright_cyan: "96",
        bright_white: "97"
    }

    static backgroundColors = {
        default: "49",
        black: "40",
        red: "41",
        green: "42",
        yellow: "43",
        blue: "44",
        purple: "45",
        cyan: "46",
        white: "47",
        bright_black: "100",
        bright_red: "101",
        bright_green: "102",
        bright_yellow: "103",
        bright_blue: "104",
        bright_purple: "105",
        bright_cyan: "106",
        bright_white: "107"
    }

    static emphasis = {
        default: "0",
        bold: "1",
        italics: "3",
        italic: "3",
        underline: "4",
        blink: "5",
        reverse: "7"
    }


}