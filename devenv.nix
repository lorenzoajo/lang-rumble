{ pkgs, ... }:

{
  packages = with pkgs; [
    git
    gh
    jq
    bzip2
    vue-language-server
    typescript-language-server
  ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm = {
      enable = true;
      install.enable = true;
    };
  };

  languages.typescript.enable = true;

  processes.web.exec = "pnpm dev";

  scripts = {
    dev.exec = "pnpm dev";
    build.exec = "pnpm build";
    preview.exec = "pnpm preview";
    test.exec = "pnpm test";
    data.exec = "pnpm data";
  };

  git-hooks.hooks.prettier = {
    enable = true;
    excludes = [
      "\\.md$"
      "pnpm-lock\\.yaml$"
      "^public/data/"
    ];
  };

  enterShell = ''
    echo "lang-rumble: node $(node --version), pnpm $(pnpm --version)"
  '';

  enterTest = ''
    node --version
    pnpm --version
  '';
}
