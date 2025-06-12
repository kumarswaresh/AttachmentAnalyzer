#!/bin/bash

set -e

echo "=== Agent Platform Migration Script ==="
echo

# Configuration
EXPORT_DIR="exports"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
EXPORT_FILE="agent-export-${TIMESTAMP}.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable not set"
        exit 1
    fi
    
    print_success "All dependencies available"
}

# Function to setup scripts directory
setup_scripts() {
    print_step "Setting up migration scripts..."
    
    # Install dependencies for scripts
    cd scripts
    if [ ! -f "node_modules/pg/package.json" ]; then
        npm install pg
    fi
    cd ..
    
    # Make scripts executable
    chmod +x scripts/export-agents.js
    chmod +x scripts/import-agents.js
    
    print_success "Scripts ready"
}

# Function to export agents
export_agents() {
    print_step "Exporting agents from current database..."
    
    # Create exports directory
    mkdir -p "$EXPORT_DIR"
    
    # Run export script
    cd scripts
    node export-agents.js
    cd ..
    
    # Find the latest export file
    LATEST_EXPORT=$(ls -t exports/agent-export-*.json | head -1)
    
    if [ -f "$LATEST_EXPORT" ]; then
        print_success "Export completed: $LATEST_EXPORT"
        echo "   Size: $(du -h "$LATEST_EXPORT" | cut -f1)"
        return 0
    else
        print_error "Export failed - no export file found"
        return 1
    fi
}

# Function to validate export
validate_export() {
    print_step "Validating export file..."
    
    LATEST_EXPORT=$(ls -t exports/agent-export-*.json | head -1)
    
    if [ ! -f "$LATEST_EXPORT" ]; then
        print_error "Export file not found"
        return 1
    fi
    
    # Check if file is valid JSON
    if ! node -e "JSON.parse(require('fs').readFileSync('$LATEST_EXPORT', 'utf8'))" 2>/dev/null; then
        print_error "Export file is not valid JSON"
        return 1
    fi
    
    # Check file size
    FILE_SIZE=$(stat -f%z "$LATEST_EXPORT" 2>/dev/null || stat -c%s "$LATEST_EXPORT" 2>/dev/null || echo "0")
    if [ "$FILE_SIZE" -lt 100 ]; then
        print_error "Export file is too small (${FILE_SIZE} bytes)"
        return 1
    fi
    
    print_success "Export file is valid (${FILE_SIZE} bytes)"
    return 0
}

# Function to create transfer package
create_transfer_package() {
    print_step "Creating transfer package..."
    
    PACKAGE_DIR="agent-transfer-${TIMESTAMP}"
    mkdir -p "$PACKAGE_DIR"
    
    # Copy export file
    LATEST_EXPORT=$(ls -t exports/agent-export-*.json | head -1)
    cp "$LATEST_EXPORT" "$PACKAGE_DIR/"
    
    # Copy import script and dependencies
    cp scripts/import-agents.js "$PACKAGE_DIR/"
    cp scripts/package.json "$PACKAGE_DIR/"
    
    # Create README for transfer
    cat > "$PACKAGE_DIR/README.md" << EOF
# Agent Transfer Package

This package contains exported agents and the import script.

## Setup on Target Machine

1. Ensure Node.js and PostgreSQL are installed
2. Set DATABASE_URL environment variable:
   \`\`\`bash
   export DATABASE_URL="postgresql://user:pass@host:port/database"
   \`\`\`

3. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

4. Run import:
   \`\`\`bash
   node import-agents.js $(ls agent-export-*.json)
   \`\`\`

## Verify Import

After import, verify agents are available:
\`\`\`bash
curl -X GET http://your-server:5000/api/v1/agents
\`\`\`

Generated: $(date)
Source: $(hostname)
EOF
    
    # Create archive
    tar -czf "${PACKAGE_DIR}.tar.gz" "$PACKAGE_DIR"
    
    print_success "Transfer package created: ${PACKAGE_DIR}.tar.gz"
    
    # Cleanup temp directory
    rm -rf "$PACKAGE_DIR"
    
    echo
    echo "📦 Transfer Package Ready:"
    echo "   File: ${PACKAGE_DIR}.tar.gz"
    echo "   Size: $(du -h "${PACKAGE_DIR}.tar.gz" | cut -f1)"
    echo
}

# Function to test import locally (optional)
test_import_local() {
    if [ "$1" = "--test-local" ]; then
        print_step "Testing import locally (dry run)..."
        
        # Backup current DATABASE_URL
        ORIGINAL_DB_URL="$DATABASE_URL"
        
        # Note: This would require a test database
        print_warning "Local import test requires a separate test database"
        print_warning "Skipping local test - use on target machine instead"
        
        return 0
    fi
}

# Function to show next steps
show_next_steps() {
    echo
    echo "🚀 Migration Export Complete!"
    echo
    echo "Next Steps:"
    echo "1. Transfer the package to your target machine:"
    echo "   scp ${PACKAGE_DIR}.tar.gz user@target-server:~/"
    echo
    echo "2. On the target machine:"
    echo "   tar -xzf ${PACKAGE_DIR}.tar.gz"
    echo "   cd ${PACKAGE_DIR}/"
    echo "   export DATABASE_URL='your-new-database-url'"
    echo "   npm install"
    echo "   node import-agents.js agent-export-*.json"
    echo
    echo "3. Verify the import:"
    echo "   curl -X GET http://target-server:5000/api/v1/agents"
    echo
    echo "4. Test marketing campaign agent:"
    echo "   See API_TESTING_GUIDE.md for complete testing instructions"
    echo
}

# Main execution flow
main() {
    check_dependencies
    setup_scripts
    
    if export_agents && validate_export; then
        create_transfer_package
        test_import_local "$1"
        show_next_steps
        
        print_success "Agent migration export completed successfully!"
        exit 0
    else
        print_error "Migration export failed"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"