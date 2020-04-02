import { createToken, ITokenConfig, Lexer, TokenType } from "chevrotain";

export const allTokens: TokenType[] = [];

function createTok(options: ITokenConfig) {
    const newToken = createToken(options);
    allTokens.push(newToken);
    return newToken;
}

export const WhiteSpace = createTok({ name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED });

//  Comments  ---
export const CommentMulti = createTok({ name: "CommentMulti", pattern: /\/[*][\s\S]*?[*]\//, line_breaks: true });
export const CommentSingle = createTok({ name: "CommentSingle", pattern: /(\/\/.*)/ });

//  Constants ---
export const BooleanInstance = createTok({ name: "BooleanInstance", pattern: /(true|false)/ });
export const StringInstance = createTok({ name: "StringInstance", pattern: /("([^"\\]*(?:\\.[^"\\]*)*)")/ });
export const NumberInstance = createTok({ name: "NumberInstance", pattern: /\b(\d+(\.\d+)?)\b/ });

//  Types ---
export const Boolean = createTok({ name: "Boolean", pattern: /\bboolean\b/ });
export const String = createTok({ name: "String", pattern: /\bstring\b/ });
export const Number = createTok({ name: "Number", pattern: /\bnumber\b/ });

export const StructureType = createTok({ name: "StructureType", pattern: /\{}/ });
export const ArrayType = createTok({ name: "ArrayType", pattern: /\[]/ });
// export const DatasetType = createTok({ name: "DatasetType", group: "entity.name.type", pattern: /\[]/ });

//  ID  ---
export const TypeID = createTok({ name: "TypeID", pattern: /[A-Z]\w*/ });
export const ID = createTok({ name: "ID", pattern: /[_a-z]\w*/ });

//  Special Chars  ---
export const Assign = createTok({ name: "Assign", pattern: /=/ });
export const SemiColon = createTok({ name: "SemiColon", pattern: /;/ });

//  Other Special Chars (todo)  ---
export const LParen = createTok({ name: "LParen", pattern: /\(/ });
export const RParen = createTok({ name: "RParen", pattern: /\)/ });
export const LCurley = createTok({ name: "LCurley", pattern: /\{/, longer_alt: StructureType });
export const RCurley = createTok({ name: "RCurley", pattern: /}/ });
export const LSquare = createTok({ name: "LSquare", pattern: /\[/, longer_alt: ArrayType });
export const RSquare = createTok({ name: "RSquare", pattern: /]/ });
export const Backslash = createTok({ name: "LSquare", pattern: /\\/ });
export const Hat = createTok({ name: "LSquare", pattern: /\^/ });
export const Dollar = createTok({ name: "LSquare", pattern: /\$/ });
export const Period = createTok({ name: "Period", pattern: /\./ });
export const Pipe = createTok({ name: "LSquare", pattern: /\|/ });
export const Question = createTok({ name: "LSquare", pattern: /\?/ });
export const Star = createTok({ name: "LSquare", pattern: /\*/ });
export const Plus = createTok({ name: "Plus", pattern: /\+/ });
export const Minus = createTok({ name: "Minus", pattern: /-/ });
export const Comma = createTok({ name: "Comma", pattern: /,/ });
export const Quote = createTok({ name: "Quote", pattern: /'/ });
export const DoubleQuote = createTok({ name: "DoubleQuote", pattern: /"/ });

//  Lexer  ---
export const HoshieLexer = new Lexer(allTokens);
