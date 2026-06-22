package main

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/muesli/termenv"
	"tangent-cli/tui"
)

func main() {
	// Apple Terminal (and many setups) can't render 24-bit color sequences.
	// ANSI256 is reliable and covers all of our color needs.
	lipgloss.SetColorProfile(termenv.ANSI256)
	p := tea.NewProgram(tui.New(), tea.WithAltScreen(), tea.WithMouseCellMotion())
	if _, err := p.Run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
