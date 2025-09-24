#!/bin/bash

# ICPHub DFX CLI - Direct canister interaction script
# This script provides a direct interface to the canister using dfx commands

set -e

# Configuration
CONFIG_DIR="$HOME/.icphub"
CONFIG_FILE="$CONFIG_DIR/dfx-config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Environment configuration
LOCAL_HOST="http://localhost:4943"
PROD_HOST="https://ic0.app"
LOCAL_CANISTER_ID="uxrrr-q7777-77774-qaaaq-cai"  # Default from .env
PROD_CANISTER_ID="gpddv-xaaaa-aaaai-atlua-cai"

# ICP Ledger canister IDs
LOCAL_ICP_LEDGER_ID="rrkah-fqaaa-aaaaa-aaaaq-cai"  # Local ledger (usually same as mainnet)
PROD_ICP_LEDGER_ID="rrkah-fqaaa-aaaaa-aaaaq-cai"   # Mainnet ICP Ledger

# Functions
print_header() {
    echo -e "${BLUE}🏢 ICPHub DFX CLI - Direct Canister Interface${NC}"
    echo -e "${BLUE}===============================================${NC}"
}

load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        ENV=$(jq -r '.environment // "local"' "$CONFIG_FILE" 2>/dev/null || echo "local")
    else
        ENV="local"
    fi
}

save_config() {
    mkdir -p "$CONFIG_DIR"
    echo "{\"environment\": \"$ENV\"}" > "$CONFIG_FILE"
}

show_environment() {
    if [[ "$ENV" == "production" ]]; then
        echo -e "${RED}🌐 ENVIRONMENT: PRODUCTION${NC}"
        echo -e "${RED}📍 CANISTER: $PROD_CANISTER_ID${NC}"
        echo -e "${RED}🌍 HOST: $PROD_HOST${NC}"
        echo -e "${RED}💰 ICP LEDGER: $PROD_ICP_LEDGER_ID${NC}"
        CANISTER_ID="$PROD_CANISTER_ID"
        ICP_LEDGER_ID="$PROD_ICP_LEDGER_ID"
        NETWORK="ic"
    else
        echo -e "${GREEN}🏠 ENVIRONMENT: LOCAL${NC}"
        echo -e "${GREEN}📍 CANISTER: $LOCAL_CANISTER_ID${NC}"
        echo -e "${GREEN}🌍 HOST: $LOCAL_HOST${NC}"
        echo -e "${GREEN}💰 ICP LEDGER: $LOCAL_ICP_LEDGER_ID${NC}"
        CANISTER_ID="$LOCAL_CANISTER_ID"
        ICP_LEDGER_ID="$LOCAL_ICP_LEDGER_ID"
        NETWORK="local"
    fi
    echo ""
}

confirm_write_operation() {
    local operation="$1"
    echo -e "${YELLOW}⚠️  WRITE OPERATION: $operation${NC}"
    if [[ "$ENV" == "production" ]]; then
        echo -e "${RED}⚠️  THIS WILL MODIFY THE PRODUCTION CANISTER!${NC}"
    fi
    echo -e "${CYAN}Do you want to proceed? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Operation cancelled.${NC}"
        exit 0
    fi
}

# Read operations (no confirmation needed)
cmd_status() {
    echo -e "${BLUE}📊 Canister Status${NC}"
    echo "==================="
    dfx canister --network "$NETWORK" status context_registry
}

cmd_get_version() {
    echo -e "${BLUE}🏷️  Canister Version${NC}"
    echo "===================="
    dfx canister --network "$NETWORK" call context_registry getCanisterVersion --query
}

cmd_list_seasons() {
    echo -e "${BLUE}📅 All Seasons${NC}"
    echo "=============="
    dfx canister --network "$NETWORK" call context_registry listSeasons --query
}

cmd_get_season() {
    local season_id="$1"
    if [[ -z "$season_id" ]]; then
        echo -e "${RED}Usage: $0 get-season <season_id>${NC}"
        exit 1
    fi
    echo -e "${BLUE}📅 Season $season_id Details${NC}"
    echo "========================"
    dfx canister --network "$NETWORK" call context_registry getSeason "($season_id)" --query
}

cmd_list_admins() {
    echo -e "${BLUE}👑 Admin Users${NC}"
    echo "=============="
    dfx canister --network "$NETWORK" call context_registry getAllAdmins --query
}

cmd_list_names() {
    echo -e "${BLUE}📝 Name Records${NC}"
    echo "==============="
    dfx canister --network "$NETWORK" call context_registry listNameRecords --query
}

cmd_get_name() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}Usage: $0 get-name <name>${NC}"
        exit 1
    fi
    echo -e "${BLUE}📝 Name Record: $name${NC}"
    echo "======================="
    dfx canister --network "$NETWORK" call context_registry getNameRecord "(\"$name\")" --query
}

cmd_get_balances() {
    echo -e "${BLUE}💰 Canister Balances${NC}"
    echo "===================="
    echo "ICP Balance:"
    dfx canister --network "$NETWORK" call context_registry getIcpBalance --query
    echo ""
    echo "Cycles Balance:"
    dfx canister --network "$NETWORK" call context_registry getCyclesBalance --query
}

cmd_get_ledger_config() {
    echo -e "${BLUE}💰 ICP Ledger Configuration${NC}"
    echo "============================"
    dfx canister --network "$NETWORK" call context_registry getIcpLedgerCanisterId --query
}

# Write operations (require confirmation)
cmd_init_access_control() {
    confirm_write_operation "Initialize Access Control (first caller becomes admin)"
    echo -e "${BLUE}🔧 Initializing Access Control${NC}"
    echo "==============================="
    echo -e "${CYAN}Setting ICP Ledger canister ID: $ICP_LEDGER_ID${NC}"
    dfx canister --network "$NETWORK" call context_registry initializeAccessControl "(principal \"$ICP_LEDGER_ID\")"
    echo -e "${GREEN}✅ Access control initialized with ICP Ledger: $ICP_LEDGER_ID${NC}"
}

cmd_create_season() {
    local name="$1"
    local start_time="$2"
    local end_time="$3"
    local max_names="$4"
    local min_length="$5"
    local max_length="$6"
    local price="$7"

    if [[ -z "$name" || -z "$start_time" || -z "$end_time" || -z "$max_names" || -z "$min_length" || -z "$max_length" || -z "$price" ]]; then
        echo -e "${RED}Usage: $0 create-season <name> <start_time_ns> <end_time_ns> <max_names> <min_length> <max_length> <price>${NC}"
        echo -e "${YELLOW}Example: $0 create-season \"Spring 2025\" 1640995200000000000 1672531200000000000 100 3 20 1000000${NC}"
        exit 1
    fi

    confirm_write_operation "Create Season: $name"
    echo -e "${BLUE}🆕 Creating Season${NC}"
    echo "=================="
    dfx canister --network "$NETWORK" call context_registry createSeason "(\"$name\", $start_time, $end_time, $max_names, $min_length, $max_length, $price)"
    echo -e "${GREEN}✅ Season created${NC}"
}

cmd_activate_season() {
    local season_id="$1"
    if [[ -z "$season_id" ]]; then
        echo -e "${RED}Usage: $0 activate-season <season_id>${NC}"
        exit 1
    fi

    confirm_write_operation "Activate Season $season_id"
    echo -e "${BLUE}🟢 Activating Season $season_id${NC}"
    echo "=========================="
    dfx canister --network "$NETWORK" call context_registry activateSeason "($season_id)"
    echo -e "${GREEN}✅ Season $season_id activated${NC}"
}

cmd_end_season() {
    local season_id="$1"
    if [[ -z "$season_id" ]]; then
        echo -e "${RED}Usage: $0 end-season <season_id>${NC}"
        exit 1
    fi

    confirm_write_operation "End Season $season_id"
    echo -e "${BLUE}🔴 Ending Season $season_id${NC}"
    echo "====================="
    dfx canister --network "$NETWORK" call context_registry endSeason "($season_id)"
    echo -e "${GREEN}✅ Season $season_id ended${NC}"
}

cmd_register_name() {
    local name="$1"
    local address="$2"
    local address_type="$3"
    local owner="$4"
    local season_id="$5"

    if [[ -z "$name" || -z "$address" || -z "$address_type" || -z "$owner" || -z "$season_id" ]]; then
        echo -e "${RED}Usage: $0 register-name <name> <address> <address_type> <owner> <season_id>${NC}"
        echo -e "${YELLOW}Address types: identity, canister${NC}"
        echo -e "${YELLOW}Example: $0 register-name \"testname\" \"principal-id\" identity \"owner-principal\" 1${NC}"
        exit 1
    fi

    confirm_write_operation "Register Name: $name"
    echo -e "${BLUE}📝 Registering Name${NC}"
    echo "==================="
    dfx canister --network "$NETWORK" call context_registry registerName "(\"$name\", principal \"$address\", variant { $address_type }, principal \"$owner\", $season_id)"
    echo -e "${GREEN}✅ Name $name registered${NC}"
}

cmd_assign_role() {
    local principal_id="$1"
    local role="$2"

    if [[ -z "$principal_id" || -z "$role" ]]; then
        echo -e "${RED}Usage: $0 assign-role <principal_id> <role>${NC}"
        echo -e "${YELLOW}Roles: admin, user, guest${NC}"
        exit 1
    fi

    confirm_write_operation "Assign role '$role' to $principal_id"
    echo -e "${BLUE}👑 Assigning Role${NC}"
    echo "=================="
    dfx canister --network "$NETWORK" call context_registry assignCallerUserRole "(principal \"$principal_id\", variant { $role })"
    echo -e "${GREEN}✅ Role $role assigned to $principal_id${NC}"
}

# Environment management
cmd_env() {
    local env_cmd="$1"
    case "$env_cmd" in
        "local")
            ENV="local"
            save_config
            echo -e "${GREEN}✅ Switched to LOCAL environment${NC}"
            show_environment
            ;;
        "production"|"prod")
            ENV="production"
            save_config
            echo -e "${RED}✅ Switched to PRODUCTION environment${NC}"
            show_environment
            ;;
        "status")
            show_environment
            ;;
        *)
            echo -e "${RED}Usage: $0 env <local|production|status>${NC}"
            exit 1
            ;;
    esac
}

cmd_help() {
    echo -e "${BLUE}🏢 ICPHub DFX CLI - Direct Canister Interface${NC}"
    echo -e "${BLUE}===============================================${NC}"
    echo ""
    echo -e "${CYAN}🔄 Environment Management:${NC}"
    echo "  $0 env local                     Switch to local environment"
    echo "  $0 env production               Switch to production environment"
    echo "  $0 env status                   Show current environment"
    echo ""
    echo -e "${CYAN}📊 Read Operations (Query):${NC}"
    echo "  $0 version                      Show canister version"
    echo "  $0 seasons                      List all seasons"
    echo "  $0 season <id>                  Get season details"
    echo "  $0 admins                       List all admins"
    echo "  $0 names                        List all name records"
    echo "  $0 name <name>                  Get name record details"
    echo "  $0 balances                     Show ICP and cycles balances"
    echo "  $0 ledger-config                Show configured ICP Ledger canister ID"
    echo ""
    echo -e "${CYAN}✏️  Write Operations (Update - requires confirmation):${NC}"
    echo "  $0 init                         Initialize access control"
    echo "  $0 create-season <name> <start> <end> <max> <min> <max> <price>"
    echo "  $0 activate-season <id>         Activate a season"
    echo "  $0 end-season <id>              End a season"
    echo "  $0 register-name <name> <addr> <type> <owner> <season>"
    echo "  $0 assign-role <principal> <role>"
    echo ""
    echo -e "${YELLOW}⚠️  Note: Write operations require confirmation and admin permissions${NC}"
    echo -e "${YELLOW}⚠️  Production operations are highlighted in RED for safety${NC}"
}

# Main script
main() {
    # Check if jq is installed (for config file parsing)
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed. Please install jq.${NC}"
        exit 1
    fi

    # Suppress mainnet plaintext identity warning for CLI usage
    export DFX_WARNING=-mainnet_plaintext_identity

    # Load current environment
    load_config

    # Show header and environment
    print_header
    show_environment

    # Handle commands
    case "$1" in
        "env")
            cmd_env "$2"
            ;;
        "status")
            cmd_status
            ;;
        "version")
            cmd_get_version
            ;;
        "seasons")
            cmd_list_seasons
            ;;
        "season")
            cmd_get_season "$2"
            ;;
        "admins")
            cmd_list_admins
            ;;
        "names")
            cmd_list_names
            ;;
        "name")
            cmd_get_name "$2"
            ;;
        "balances")
            cmd_get_balances
            ;;
        "ledger-config")
            cmd_get_ledger_config
            ;;
        "init")
            cmd_init_access_control
            ;;
        "create-season")
            cmd_create_season "$2" "$3" "$4" "$5" "$6" "$7" "$8"
            ;;
        "activate-season")
            cmd_activate_season "$2"
            ;;
        "end-season")
            cmd_end_season "$2"
            ;;
        "register-name")
            cmd_register_name "$2" "$3" "$4" "$5" "$6"
            ;;
        "assign-role")
            cmd_assign_role "$2" "$3"
            ;;
        "help"|"--help"|"-h"|"")
            cmd_help
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"