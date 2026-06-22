package tui

import (
	"fmt"
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

// withLineBg injects an ANSI256 background color into a pre-highlighted string
// so the background persists across token reset boundaries. This is the same
// technique used for the neutral foreground fix above — chroma's \033[0m resets
// clear the background, so we re-apply it after every reset.
// A background reset (\033[49m) is appended at the end so the color does not
// bleed into the next line.
func withLineBg(highlighted string, bgAnsi256 int) string {
	bgCode := fmt.Sprintf("\033[48;5;%dm", bgAnsi256)
	result := bgCode + strings.ReplaceAll(highlighted, "\033[0m", "\033[0m"+bgCode)
	return result + "\033[49m"
}
