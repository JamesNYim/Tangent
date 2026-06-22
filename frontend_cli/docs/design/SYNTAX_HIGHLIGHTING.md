# Syntax Highlighting

## The Library

Syntax highlighting uses [Chroma](https://github.com/alecthomas/chroma), a Go library that supports hundreds of languages. Given a code string and a language name, Chroma tokenizes the code and applies a color theme.

All code in `tui/highlight.go`.

---

## The Pipeline

```go
func highlightCode(code, lang string) string {
    // 1. Pick a lexer (tokenizer) for the language
    lexer := lexers.Get(lang)       // try the explicit language name first
    if lexer == nil {
        lexer = lexers.Analyse(code) // auto-detect from the code content
    }
    if lexer == nil {
        lexer = lexers.Fallback     // plain text — no highlighting
    }

    // 2. Pick a color theme
    style := styles.Get("monokai")

    // 3. Pick an output format
    formatter := formatters.Get("terminal256")  // ANSI 256-color escape codes

    // 4. Tokenize and format
    tokens, _ := lexer.Tokenise(nil, code)
    formatter.Format(&buf, style, tokens)

    return buf.String()
}
```

The `terminal256` formatter outputs ANSI escape sequences — special byte sequences that terminals interpret as "change color to X." This is what produces colored output in the terminal without needing any special rendering library.

---

## The ANSI Reset Problem

Chroma emits `\033[0m` (a full terminal reset) after every token. A full reset clears everything — foreground color, background color, bold, underline. The problem: after a reset, the terminal falls back to its **default foreground color**, which varies by terminal theme. On some setups this is green, on others gray, making the in-between characters look wrong.

**The fix:** replace every `\033[0m` with `\033[0m\033[38;5;252m` — a reset followed immediately by "set foreground to ANSI256 color 252" (a neutral light gray). This ensures all characters between highlighted tokens have a consistent, readable color regardless of what the user's terminal theme defaults to.

```go
const ansiReset = "\033[0m"
const neutralFg = "\033[0m\033[38;5;252m"
result := neutralFg + strings.ReplaceAll(buf.String(), ansiReset, neutralFg)
```

---

## Line-Select Background

When the user is in LINE SELECT mode, selected lines get a green background highlight. But the same ANSI reset problem applies to backgrounds: Chroma's `\033[0m` would clear the background color mid-line.

`withLineBg` applies the same injection technique for a background color:

```go
func withLineBg(highlighted string, bgAnsi256 int) string {
    bgCode := fmt.Sprintf("\033[48;5;%dm", bgAnsi256)
    result := bgCode + strings.ReplaceAll(highlighted, "\033[0m", "\033[0m"+bgCode)
    return result + "\033[49m"  // reset background at the end of the line
}
```

The `\033[49m` at the end resets only the background (not the foreground), so the color doesn't bleed into the next line.

---

## Where Highlighting Is Triggered

- **Code blocks in AI responses** — `parseAIResponse` in `tui.go` detects fenced code blocks (` ```lang `) and creates `msgKindCode` entries with the language stored in `msg.lang`. `renderMessages` calls `highlightCode(msg.content, msg.lang)` when rendering these.
- **Diffs** — `renderDiff` applies highlighting to individual lines, with `+`/`-` prefix coloring layered on top.
- **Context quotes** — when a quoted selection has a language (the source was a code block), `msgKindQuote` rendering also runs `highlightCode`.
- **LINE SELECT** — `renderLineSelect` highlights code block lines so the selection view matches what the user sees in the feed.
