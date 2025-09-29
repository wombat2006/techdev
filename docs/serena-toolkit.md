# Serena - Coding Agent Toolkit

<p align="center" style="text-align:center">
  <img src="resources/serena-logo.svg#gh-light-mode-only" style="width:500px">
  <img src="resources/serena-logo-dark-mode.svg#gh-dark-mode-only" style="width:500px">
</p>

* :rocket: Serena is a powerful **coding agent toolkit** capable of turning an LLM into a fully-featured agent that works **directly on your codebase**.
  Unlike most other tools, it is not tied to an LLM, framework or an interface, making it easy to use it in a variety of ways.
* :wrench: Serena provides essential **semantic code retrieval and editing tools** that are akin to an IDE's capabilities, extracting code entities at the symbol level and exploiting relational structure. When combined with an existing coding agent, these tools greatly enhance (token) efficiency.
* :free: Serena is **free & open-source**, enhancing the capabilities of LLMs you already have access to free of charge.

You can think of Serena as providing IDE-like tools to your LLM/coding agent. With it, the agent no longer needs to read entire
files, perform grep-like searches or string replacements to find and edit the right code. Instead, it can use code centered tools like `find_symbol`, `find_referencing_symbols` and `insert_after_symbol`.

<p align="center">
  <em>Serena is under active development! See the latest updates, upcoming features, and lessons learned to stay up to date.</em>
</p>

<p align="center">
  <a href="CHANGELOG.md">
    <img src="https://img.shields.io/badge/Updates-1e293b?style=flat&logo=rss&logoColor=white&labelColor=1e293b" alt="Changelog" />
  </a>
  <a href="roadmap.md">
    <img src="https://img.shields.io/badge/Roadmap-14532d?style=flat&logo=target&logoColor=white&labelColor=14532d" alt="Roadmap" />
  </a>
  <a href="lessons_learned.md">
    <img src="https://img.shields.io/badge/Lessons-Learned-7c4700?style=flat&logo=readthedocs&logoColor=white&labelColor=7c4700" alt="Lessons Learned" />
  </a>
</p>

### LLM Integration

Serena provides the necessary [tools](#list-of-tools) for coding workflows, but an LLM is required to do the actual work,
orchestrating tool use.

For example, **supercharge the performance of Claude Code** with a [one-line shell command](#claude-code).

In general, Serena can be integrated with an LLM in several ways:

* by using the **model context protocol (MCP)**.
  Serena provides an MCP server which integrates with
    * Claude Code and Claude Desktop,
    * Terminal-based clients like Codex, Gemini-CLI, Qwen3-Coder, rovodev, OpenHands CLI and others,
    * IDEs like VSCode, Cursor or IntelliJ,
    * Extensions like Cline or Roo Code
    * Local clients like [OpenWebUI](https://docs.openwebui.com/openapi-servers/mcp), [Jan](https://jan.ai/docs/mcp-examples/browser/browserbase#enable-mcp), [Agno](https://docs.agno.com/introduction/playground) and others
* by using [mcpo to connect it to ChatGPT](docs/serena_on_chatgpt.md) or other clients that don't support MCP but do support tool calling via OpenAPI.
* by incorporating Serena's tools into an agent framework of your choice, as illustrated [here](docs/custom_agent.md).
  Serena's tool implementation is decoupled from the framework-specific code and can thus easily be adapted to any agent framework.

### Serena in Action

#### Demonstration 1: Efficient Operation in Claude Code

A demonstration of Serena efficiently retrieving and editing code within Claude Code, thereby saving tokens and time. Efficient operations are not only useful for saving costs, but also for generally improving the generated code's quality. This effect may be less pronounced in very small projects, but often becomes of crucial importance in larger ones.

#### Demonstration 2: Serena in Claude Desktop

A demonstration of Serena implementing a small feature for itself (a better log GUI) with Claude Desktop.
Note how Serena's tools enable Claude to find and edit the right symbols.

### Programming Language Support & Semantic Analysis Capabilities

Serena's semantic code analysis capabilities build on **language servers** using the widely implemented
language server protocol (LSP). The LSP provides a set of versatile code querying
and editing functionalities based on symbolic understanding of the code.
Equipped with these capabilities, Serena discovers and edits code just like a seasoned developer
making use of an IDE's capabilities would.
Serena can efficiently find the right context and do the right thing even in very large and
complex projects! So not only is it free and open-source, it frequently achieves better results
than existing solutions that charge a premium.

Language servers provide support for a wide range of programming languages.
With Serena, we provide direct, out-of-the-box support for:

  * Python
  * TypeScript/Javascript
  * PHP (uses Intelephense LSP; set `INTELEPHENSE_LICENSE_KEY` environment variable for premium features)
  * Go (requires installation of gopls)
  * R (requires installation of the `languageserver` R package)
  * Rust (requires [rustup](https://rustup.rs/) - uses rust-analyzer from your toolchain)
  * C/C++ (you may experience issues with finding references, we are working on it)
  * Zig (requires installation of ZLS - Zig Language Server)
  * C#
  * Ruby (by default, uses [ruby-lsp](https://github.com/Shopify/ruby-lsp), specify ruby_solargraph as your language to use the previous solargraph based implementation)
  * Swift
  * Kotlin (uses the pre-alpha [official kotlin LS](https://github.com/Kotlin/kotlin-lsp), some issues may appear)
  * Java (_Note_: startup is slow, initial startup especially so. There may be issues with java on macos and linux, we are working on it.)
  * Clojure
  * Dart
  * Bash
  * Lua (automatically downloads lua-language-server if not installed)
  * Nix (requires nixd installation)
  * Elixir (requires installation of NextLS and Elixir; **Windows not supported**)
  * Erlang (requires installation of beam and [erlang_ls](https://github.com/erlang-ls/erlang_ls), experimental, might be slow or hang)
  * AL

Support for further languages can easily be added by providing a shallow adapter for a new language server implementation,
see Serena's [memory on that](.serena/memories/adding_new_language_support_guide.md).

### Community Feedback

Most users report that Serena has strong positive effects on the results of their coding agents, even when used within
very capable agents like Claude Code. Serena is often described to be a [game changer](https://www.reddit.com/r/ClaudeAI/comments/1lfsdll/try_out_serena_mcp_thank_me_later/), providing an enormous [productivity boost](https://www.reddit.com/r/ClaudeCode/comments/1mguoia/absolutely_insane_improvement_of_claude_code).

Serena excels at navigating and manipulating complex codebases, providing tools that support precise code retrieval and editing in the presence of large, strongly structured codebases.
However, when dealing with tasks that involve only very few/small files, you may not benefit from including Serena on top of your existing coding agent.
In particular, when writing code from scratch, Serena will not provide much value initially, as the more complex structures that Serena handles more gracefully than simplistic, file-based approaches are yet to be created.

Several videos and blog posts have talked about Serena:

* YouTube:
    * [AI Labs](https://www.youtube.com/watch?v=wYWyJNs1HVk&t=1s)
    * [Yo Van Eyck](https://www.youtube.com/watch?v=UqfxuQKuMo8&t=45s)
    * [JeredBlu](https://www.youtube.com/watch?v=fzPnM3ySmjE&t=32s)

* Blog posts:
    * [Serena's Design Principles](https://medium.com/@souradip1000/deconstructing-serenas-mcp-powered-semantic-code-understanding-architecture-75802515d116)
    * [Serena with Claude Code (in Japanese)](https://blog.lai.so/serena/)
    * [Turning Claude Code into a Development Powerhouse](https://robertmarshall.dev/blog/turning-claude-code-into-a-development-powerhouse/)

## Table of Contents

<!-- Created with markdown-toc -i README.md -->
<!-- Install it with npm install -g markdown-toc -->

<!-- toc -->

- [Quick Start](#quick-start)
  * [Running the Serena MCP Server](#running-the-serena-mcp-server)
    + [Usage](#usage)
    + [Using uvx](#using-uvx)
    + [Local Installation](#local-installation)
    + [Using Docker (Experimental)](#using-docker-experimental)
    + [Using Nix](#using-nix)
    + [Streamable HTTP Mode](#streamable-http-mode)
    + [Command-Line Arguments](#command-line-arguments)
  * [Configuration](#configuration)
  * [Project Activation & Indexing](#project-activation--indexing)
  * [Claude Code](#claude-code)
  * [Codex](#codex)
  * [Other Terminal-Based Clients](#other-terminal-based-clients)
  * [Claude Desktop](#claude-desktop)
  * [MCP Coding Clients (Cline, Roo-Code, Cursor, Windsurf, etc.)](#mcp-coding-clients-cline-roo-code-cursor-windsurf-etc)
  * [Local GUIs and Frameworks](#local-guis-and-frameworks)
- [Detailed Usage and Recommendations](#detailed-usage-and-recommendations)
  * [Tool Execution](#tool-execution)
    + [Shell Execution and Editing Tools](#shell-execution-and-editing-tools)
  * [Modes and Contexts](#modes-and-contexts)
    + [Contexts](#contexts)
    + [Modes](#modes)
    + [Customization](#customization)
  * [Onboarding and Memories](#onboarding-and-memories)
  * [Prepare Your Project](#prepare-your-project)
    + [Structure Your Codebase](#structure-your-codebase)
    + [Start from a Clean State](#start-from-a-clean-state)
    + [Logging, Linting, and Automated Tests](#logging-linting-and-automated-tests)
  * [Prompting Strategies](#prompting-strategies)
  * [Running Out of Context](#running-out-of-context)
  * [Serena's Logs: The Dashboard and GUI Tool](#serenas-logs-the-dashboard-and-gui-tool)
- [Comparison with Other Coding Agents](#comparison-with-other-coding-agents)
  * [Subscription-Based Coding Agents](#subscription-based-coding-agents)
  * [API-Based Coding Agents](#api-based-coding-agents)
  * [Other MCP-Based Coding Agents](#other-mcp-based-coding-agents)
- [Acknowledgements](#acknowledgements)
  * [Sponsors](#sponsors)
  * [Community Contributions](#community-contributions)
  * [Technologies](#technologies)
- [Customizing and Extending Serena](#customizing-and-extending-serena)
- [List of Tools](#list-of-tools)

<!-- tocstop -->

## Quick Start

Serena can be used in various ways, below you will find instructions for selected integrations.

* For coding with Claude, we recommend using Serena through [Claude Code](#claude-code) or [Claude Desktop](#claude-desktop). You can also use Serena in most other [terminal-based clients](#other-terminal-based-clients).
* If you want a GUI experience outside an IDE, you can use one of the many [local GUIs](#local-guis-and-frameworks) that support MCP servers.
  You can also connect Serena to many web clients (including ChatGPT) using [mcpo](docs/serena_on_chatgpt.md).
* If you want to use Serena integrated in your IDE, see the section on [other MCP clients](#other-mcp-clients---cline-roo-code-cursor-windsurf-etc).
* You can use Serena as a library for building your own applications. We try to keep the public API stable, but you should still
  expect breaking changes and pin Serena to a fixed version if you use it as a dependency.

Serena is managed by `uv`, so you will need to [install it](https://docs.astral.sh/uv/getting-started/installation/).

### Running the Serena MCP Server

You have several options for running the MCP server, which are explained in the subsections below.

#### Usage

The typical usage involves the client (Claude Code, Claude Desktop, etc.) running
the MCP server as a subprocess (using stdio communication),
so the client needs to be provided with the command to run the MCP server.
(Alternatively, you can run the MCP server in Streamable HTTP or SSE mode and tell your client
how to connect to it.)

Note that no matter how you run the MCP server, Serena will, by default, start a small web-based dashboard on localhost that will display logs and allow shutting down the
MCP server (since many clients fail to clean up processes correctly).
This and other settings can be adjusted in the [configuration](#configuration) and/or by providing [command-line arguments](#command-line-arguments).

#### Using uvx

`uvx` can be used to run the latest version of Serena directly from the repository, without an explicit local installation.

```shell
uvx --from git+https://github.com/oraios/serena serena start-mcp-server
```

Explore the CLI to see some of the customization options that serena provides (more info on them below).

#### Local Installation

1. Clone the repository and change into it.

   ```shell
   git clone https://github.com/oraios/serena
   cd serena
   ```

2. Optionally edit the configuration file in your home directory with

   ```shell
   uv run serena config edit
   ```

   If you just want the default config, you can skip this part, and a config file will be created when you first run Serena.
3. Run the server with `uv`:

   ```shell
   uv run serena start-mcp-server
   ```

   When running from outside the serena installation directory, be sure to pass it, i.e., use

   ```shell
    uv run --directory /abs/path/to/serena serena start-mcp-server
   ```

#### Using Docker (Experimental)

⚠️ Docker support is currently experimental with several limitations. Please read the [Docker documentation](DOCKER.md) for important caveats before using it.

You can run the Serena MCP server directly via docker as follows,
assuming that the projects you want to work on are all located in `/path/to/your/projects`:

```shell
docker run --rm -i --network host -v /path/to/your/projects:/workspaces/projects ghcr.io/oraios/serena:latest serena start-mcp-server --transport stdio
```

Replace `/path/to/your/projects` with the absolute path to your projects directory. The Docker approach provides:

* Better security isolation for shell command execution
* No need to install language servers and dependencies locally
* Consistent environment across different systems

Alternatively, use docker compose with the `compose.yml` file provided in the repository.

See the [Docker documentation](DOCKER.md) for detailed setup instructions, configuration options, and known limitations.

#### Using Nix

If you are using Nix and [have enabled the `nix-command` and `flakes` features](https://nixos.wiki/wiki/flakes), you can run Serena using the following command:

```bash
nix run github:oraios/serena -- start-mcp-server --transport stdio
```

You can also install Serena by referencing this repo (`github:oraios/serena`) and using it in your Nix flake. The package is exported as `serena`.

#### Streamable HTTP Mode

ℹ️ Note that MCP servers which use stdio as a protocol are somewhat unusual as far as client/server architectures go, as the server
necessarily has to be started by the client in order for communication to take place via the server's standard input/output stream.
In other words, you do not need to start the server yourself. The client application (e.g. Claude Desktop) takes care of this and
therefore needs to be configured with a launch command.

When using instead the *Streamable HTTP* mode, you control the server lifecycle yourself,
i.e. you start the server and provide the client with the URL to connect to it.

Simply provide `start-mcp-server` with the `--transport streamable-http` option and optionally provide the port.
For example, to run the Serena MCP server in Streamable HTTP mode on port 9121 using a local installation,
you would run this command from the Serena directory,

```shell
uv run serena start-mcp-server --transport streamable-http --port 9121
```

and then configure your client to connect to `http://localhost:9121/mcp`.

ℹ️ Note that SSE transport is supported as well, but its use is discouraged.
Use Streamable HTTP instead.

#### Command-Line Arguments

The Serena MCP server supports a wide range of additional command-line options, including the option to run in Streamable HTTP or SSE mode
and to adapt Serena to various [contexts and modes of operation](#modes-and-contexts).

Run with parameter `--help` to get a list of available options.

### Configuration

Serena is very flexible in terms of configuration. While for most users, the default configurations will work,
you can fully adjust it to your needs by editing a few yaml files. You can disable tools, change Serena's instructions
(what we denote as the `system_prompt`), adjust the output of tools that just provide a prompt, and even adjust tool descriptions.

Serena is configured in four places:

1. The `serena_config.yml` for general settings that apply to all clients and projects.
   It is located in your user directory under `.serena/serena_config.yml`.
   If you do not explicitly create the file, it will be auto-generated when you first run Serena.
   You can edit it directly or use

   ```shell
   uvx --from git+https://github.com/oraios/serena serena config edit
   ```

   (or use the `--directory` command version).
2. In the arguments passed to the `start-mcp-server` in your client's config (see below),
   which will apply to all sessions started by the respective client. In particular, the [context](#contexts) parameter
   should be set appropriately for Serena to be best adjusted to existing tools and capabilities of your client.
   See for a detailed explanation. You can override all entries from the `serena_config.yml` through command line arguments.
3. In the `.serena/project.yml` file within your project. This will hold project-level configuration that is used whenever
   that project is activated. This file will be autogenerated when you first use Serena on that project, but you can also
   generate it explicitly with

   ```shell
   uvx --from git+https://github.com/oraios/serena serena project generate-yml
   ```

   (or use the `--directory` command version).
4. Through the context and modes. Explore the [modes and contexts](#modes-and-contexts) section for more details.

After the initial setup, continue with one of the sections below, depending on how you
want to use Serena.

### Project Activation & Indexing

If you are mostly working with the same project, you can configure to always activate it at startup
by passing `--project <path_or_name>` to the `start-mcp-server` command in your client's MCP config.
This is especially useful for clients which configure MCP servers on a per-project basis, like Claude Code.

Otherwise, the recommended way is to just ask the LLM to activate a project by providing it an absolute path to, or,
in case the project was activated in the past, by its name. The default project name is the directory name.

* "Activate the project /path/to/my_project"
* "Activate the project my_project"

All projects that have been activated will be automatically added to your `serena_config.yml`, and for each
project, the file `.serena/project.yml` will be generated. You can adjust the latter, e.g., by changing the name
(which you refer to during the activation) or other options. Make sure to not have two different projects with the
same name.

ℹ️ For larger projects, we recommend that you index your project to accelerate Serena's tools; otherwise the first
tool application may be very slow.
To do so, run this from the project directory (or pass the path to the project as an argument):

```shell
uvx --from git+https://github.com/oraios/serena serena project index
```

(or use the `--directory` command version).

### Claude Code

Serena is a great way to make Claude Code both cheaper and more powerful!

From your project directory, add serena with a command like this,

```shell
claude mcp add serena -- <serena-mcp-server> --context ide-assistant --project $(pwd)
```

where `<serena-mcp-server>` is your way of [running the Serena MCP server](#running-the-serena-mcp-server).
For example, when using `uvx`, you would run

```shell
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project $(pwd)
```

ℹ️ Serena comes with an instruction text, and Claude needs to read it to properly use Serena's tools.
  As of version `v1.0.52`, claude code reads the instructions of the MCP server, so this **is handled automatically**.
  If you are using an older version, or if Claude fails to read the instructions, you can ask it explicitly
  to "read Serena's initial instructions" or run `/mcp__serena__initial_instructions` to load the instruction text.
  If you want to make use of that, you will have to enable the corresponding tool explicitly by adding `initial_instructions` to the `included_optional_tools`
  in your config.
  Note that you may have to make Claude read the instructions when you start a new conversation and after any compacting operation to ensure Claude remains properly configured to use Serena's tools.

## TechSapo Integration Notes

This Serena toolkit documentation provides valuable insights for TechSapo's Wall-Bounce Analysis System implementation:

### Key Integration Points

1. **MCP Server Architecture**: Serena's MCP server implementation can serve as a reference for TechSapo's MCP services architecture
2. **Language Server Protocol (LSP)**: Serena's semantic code analysis using LSP could enhance TechSapo's code understanding capabilities
3. **Multi-LLM Coordination**: Serena's flexibility across different LLM providers aligns with TechSapo's multi-provider orchestration requirements
4. **Symbolic Code Operations**: Tools like `find_symbol`, `find_referencing_symbols` would complement TechSapo's analysis capabilities
5. **Project Context Management**: Serena's project activation and indexing system could inform TechSapo's context management

### Potential Adaptations for TechSapo

- **Wall-Bounce Tool Integration**: Adapt Serena's tool structure for Wall-Bounce analysis workflows
- **Japanese Language Support**: Implement Japanese-aware code analysis and documentation tools
- **Enterprise Security**: Leverage Serena's security considerations for TechSapo's enterprise-grade requirements
- **Provider Optimization**: Use Serena's context and mode system for provider-specific optimizations (Gemini 2.5 Pro, GPT-5, etc.)
- **Dashboard Integration**: Adapt Serena's dashboard concept for TechSapo's monitoring and approval workflows