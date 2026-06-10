package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	Provider string            `json:"provider"`
	APIKeys  map[string]string `json:"api_keys"`
}

func configPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".tangent", "config.json")
}

func Load() (*Config, error) {
	data, err := os.ReadFile(configPath())
	if os.IsNotExist(err) {
		return &Config{APIKeys: make(map[string]string)}, nil
	}
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if cfg.APIKeys == nil {
		cfg.APIKeys = make(map[string]string)
	}
	return &cfg, nil
}

func Save(cfg *Config) error {
	p := configPath()
	if err := os.MkdirAll(filepath.Dir(p), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0600)
}

func (c *Config) IsReady() bool {
	return c.Provider != "" && c.APIKeys[c.Provider] != ""
}
