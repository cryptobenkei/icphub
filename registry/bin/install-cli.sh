#!/bin/bash

# ICPHub CLI Installation Script
# This script installs the icphub CLI globally so you can run 'icphub' from anywhere

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="$HOME/.local/bin"
CLI_NAME="icphub"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

print_header() {
    echo -e "${BLUE}🏢 ICPHub CLI Installation${NC}"
    echo -e "${BLUE}===========================${NC}"
    echo ""
}

check_permissions() {
    # Create the install directory if it doesn't exist
    if [[ ! -d "$INSTALL_DIR" ]]; then
        echo -e "${BLUE}📁 Creating directory: $INSTALL_DIR${NC}"
        mkdir -p "$INSTALL_DIR"
    fi

    if [[ ! -w "$INSTALL_DIR" ]]; then
        echo -e "${RED}❌ Cannot write to $INSTALL_DIR${NC}"
        echo -e "${YELLOW}   Please ensure you have write permissions to this directory.${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Installing to user directory: $INSTALL_DIR${NC}"
    echo ""
}

create_wrapper_script() {
    local wrapper_path="$INSTALL_DIR/$CLI_NAME"

    echo -e "${BLUE}📝 Creating global CLI wrapper...${NC}"

    # Create the wrapper script content
    cat > /tmp/icphub-wrapper << EOF
#!/bin/bash

# ICPHub CLI Global Wrapper
# This script allows running icphub from anywhere

# Get the directory where this script is installed
INSTALL_DIR="\$(dirname "\$(readlink -f "\$0")")"

# Find the project directory by looking for package.json
# Start from the install directory and work backwards
PROJECT_DIR=""
SEARCH_DIR="\$HOME"

# Common project locations to search
SEARCH_PATHS=(
    "\$HOME/Software/icphub/registry"
    "\$HOME/icphub/registry"
    "\$HOME/projects/icphub/registry"
    "\$HOME/dev/icphub/registry"
    "\$HOME/workspace/icphub/registry"
    "$PROJECT_DIR"
)

for path in "\${SEARCH_PATHS[@]}"; do
    if [[ -f "\$path/package.json" ]] && [[ -f "\$path/bin/icphub.ts" ]]; then
        PROJECT_DIR="\$path"
        break
    fi
done

# If not found in common locations, try to find it
if [[ -z "\$PROJECT_DIR" ]]; then
    echo "🔍 Searching for ICPHub project..."
    PROJECT_DIR=\$(find "\$HOME" -name "package.json" -path "*/icphub/registry/*" -exec dirname {} \; 2>/dev/null | head -1)
fi

if [[ -z "\$PROJECT_DIR" ]] || [[ ! -f "\$PROJECT_DIR/package.json" ]]; then
    echo "❌ Error: Could not find ICPHub project directory."
    echo "   Please run this from the project directory or ensure the project is in a standard location."
    echo "   Expected locations:"
    echo "   - \$HOME/Software/icphub/registry"
    echo "   - \$HOME/icphub/registry"
    echo "   - \$HOME/projects/icphub/registry"
    exit 1
fi

# Change to project directory and run the CLI
cd "\$PROJECT_DIR"

# Check if we have dependencies installed
if [[ ! -d "node_modules" ]]; then
    echo "⚠️  Installing dependencies..."
    npm install
fi

# Run the TypeScript CLI
npx tsx bin/icphub.ts "\$@"
EOF

    # Install the wrapper script
    cp /tmp/icphub-wrapper "$wrapper_path"
    chmod +x "$wrapper_path"

    # Clean up temp file
    rm /tmp/icphub-wrapper

    echo -e "${GREEN}✅ Wrapper script created at $wrapper_path${NC}"
}

create_dfx_wrapper() {
    local wrapper_path="$INSTALL_DIR/icphub-dfx"

    echo -e "${BLUE}📝 Creating global DFX CLI wrapper...${NC}"

    # Create the DFX wrapper script content
    cat > /tmp/icphub-dfx-wrapper << EOF
#!/bin/bash

# ICPHub DFX CLI Global Wrapper
# This script allows running icphub-dfx from anywhere

# Find the project directory (same logic as main CLI)
PROJECT_DIR=""
SEARCH_PATHS=(
    "\$HOME/Software/icphub/registry"
    "\$HOME/icphub/registry"
    "\$HOME/projects/icphub/registry"
    "\$HOME/dev/icphub/registry"
    "\$HOME/workspace/icphub/registry"
    "$PROJECT_DIR"
)

for path in "\${SEARCH_PATHS[@]}"; do
    if [[ -f "\$path/package.json" ]] && [[ -f "\$path/bin/dfx-cli.sh" ]]; then
        PROJECT_DIR="\$path"
        break
    fi
done

if [[ -z "\$PROJECT_DIR" ]]; then
    PROJECT_DIR=\$(find "\$HOME" -name "package.json" -path "*/icphub/registry/*" -exec dirname {} \; 2>/dev/null | head -1)
fi

if [[ -z "\$PROJECT_DIR" ]] || [[ ! -f "\$PROJECT_DIR/bin/dfx-cli.sh" ]]; then
    echo "❌ Error: Could not find ICPHub project directory with DFX CLI."
    exit 1
fi

# Run the DFX CLI
"\$PROJECT_DIR/bin/dfx-cli.sh" "\$@"
EOF

    # Install the DFX wrapper script
    cp /tmp/icphub-dfx-wrapper "$wrapper_path"
    chmod +x "$wrapper_path"

    # Clean up temp file
    rm /tmp/icphub-dfx-wrapper

    echo -e "${GREEN}✅ DFX wrapper script created at $wrapper_path${NC}"
}

verify_installation() {
    echo -e "${BLUE}🔍 Verifying installation...${NC}"

    if command -v icphub &> /dev/null; then
        echo -e "${GREEN}✅ icphub command is available${NC}"

        # Test the command
        echo -e "${CYAN}🧪 Testing icphub command...${NC}"
        icphub env status > /dev/null 2>&1 && echo -e "${GREEN}✅ icphub command works correctly${NC}" || echo -e "${YELLOW}⚠️  icphub command installed but may need project setup${NC}"
    else
        echo -e "${RED}❌ icphub command not found in PATH${NC}"
        echo -e "${YELLOW}   You may need to restart your terminal or add $INSTALL_DIR to your PATH${NC}"
    fi

    if command -v icphub-dfx &> /dev/null; then
        echo -e "${GREEN}✅ icphub-dfx command is available${NC}"
    else
        echo -e "${RED}❌ icphub-dfx command not found in PATH${NC}"
    fi
}

show_usage_info() {
    echo ""
    echo -e "${CYAN}🎉 Installation Complete!${NC}"
    echo -e "${CYAN}========================${NC}"
    echo ""
    echo -e "${GREEN}You can now use the following commands from anywhere:${NC}"
    echo ""
    echo -e "${BLUE}TypeScript CLI (high-level interface):${NC}"
    echo "  icphub env production          # Switch to production"
    echo "  icphub status                  # Show status"
    echo "  icphub seasons                 # List seasons"
    echo "  icphub help                    # Show help"
    echo ""
    echo -e "${BLUE}DFX CLI (direct canister interaction):${NC}"
    echo "  icphub-dfx env production      # Switch to production"
    echo "  icphub-dfx seasons             # List seasons (raw dfx output)"
    echo "  icphub-dfx admins              # List admins"
    echo "  icphub-dfx help                # Show DFX help"
    echo ""
    echo -e "${YELLOW}Note: If commands are not found, add ~/.local/bin to your PATH:${NC}"
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
    echo "  source ~/.bashrc"
    echo -e "${YELLOW}Or for this session only:${NC}"
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

uninstall_cli() {
    echo -e "${YELLOW}🗑️  Uninstalling ICPHub CLI...${NC}"

    local files_to_remove=("$INSTALL_DIR/icphub" "$INSTALL_DIR/icphub-dfx")
    local removed_count=0

    for file in "${files_to_remove[@]}"; do
        if [[ -f "$file" ]]; then
            rm "$file"
            echo -e "${GREEN}✅ Removed $file${NC}"
            ((removed_count++))
        fi
    done

    if [[ $removed_count -eq 0 ]]; then
        echo -e "${YELLOW}ℹ️  No ICPHub CLI files found to remove${NC}"
    else
        echo -e "${GREEN}✅ ICPHub CLI uninstalled successfully${NC}"
    fi
}

main() {
    case "$1" in
        "uninstall")
            print_header
            uninstall_cli
            ;;
        *)
            print_header
            echo -e "${CYAN}This will install the ICPHub CLI globally so you can run 'icphub' from anywhere.${NC}"
            echo ""

            check_permissions
            create_wrapper_script
            create_dfx_wrapper
            verify_installation
            show_usage_info
            ;;
    esac
}

# Run main function with all arguments
main "$@"