package tui

import (
	"strings"

	chromaHighlight "github.com/alecthomas/chroma/v2"
	"github.com/alecthomas/chroma/v2/formatters"
	"github.com/alecthomas/chroma/v2/lexers"
	"github.com/alecthomas/chroma/v2/styles"
)

// highlightCode applies ANSI256 syntax highlighting to a code block.
// lang is the language identifier from the opening fence (e.g. "go", "python").
// Falls back to lexer auto-detection, then plain text if nothing matches.
func highlightCode(code, lang string) string {
	lexer := lexers.Get(lang)
	if lexer == nil {
		lexer = lexers.Analyse(code)
	}
	if lexer == nil {
		lexer = lexers.Fallback
	}
	lexer = chromaHighlight.Coalesce(lexer)

	style := styles.Get("monokai")
	if style == nil {
		style = styles.Fallback
	}

	formatter := formatters.Get("terminal256")
	if formatter == nil {
		return code
	}

	tokenIterator, err := lexer.Tokenise(nil, code)
	if err != nil {
		return code
	}

	var buf strings.Builder
	if err := formatter.Format(&buf, style, tokenIterator); err != nil {
		return code
	}

	// Chroma emits \033[0m (full reset) after each token. After a reset the
	// terminal falls back to its default foreground color, which bleeds through
	// as whatever the user's terminal theme uses (often green or grey). Replace
	// every reset with reset + neutral light-grey (ANSI256 color 252 ≈ #d0d0d0)
	// so in-between characters have a consistent color regardless of terminal theme.
	const ansiReset = "\033[0m"
	const neutralFg = "\033[0m\033[38;5;252m"
	result := neutralFg + strings.ReplaceAll(buf.String(), ansiReset, neutralFg)

	return strings.TrimRight(result, "\n")
}
