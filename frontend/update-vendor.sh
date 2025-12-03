#!/bin/bash
# Frontend vendor dependencies update script
# Usage: ./update-vendor.sh [component]
#   component: vue, mqtt, tailwind, fonts, or all (default)

set -e

VENDOR_DIR="vendor"
mkdir -p "$VENDOR_DIR/fonts"

# Version configuration (update these when needed)
VUE_VERSION="3.4.21"
MQTT_VERSION="5.3.5"

update_vue() {
    echo "Updating Vue.js to ${VUE_VERSION}..."
    curl -fsSL -o "$VENDOR_DIR/vue.global.prod.js" \
        "https://unpkg.com/vue@${VUE_VERSION}/dist/vue.global.prod.js"
    echo "✓ Vue.js updated"
}

update_mqtt() {
    echo "Updating MQTT.js to ${MQTT_VERSION}..."
    curl -fsSL -o "$VENDOR_DIR/mqtt.min.js" \
        "https://unpkg.com/mqtt@${MQTT_VERSION}/dist/mqtt.min.js"
    echo "✓ MQTT.js updated"
}

update_tailwind() {
    echo "Building Tailwind CSS..."
    if ! command -v npx &> /dev/null; then
        echo "⚠ npx not found. Please install Node.js to build Tailwind."
        echo "  Alternatively, download from: https://cdn.tailwindcss.com"
        return 1
    fi

    # Create temporary tailwind.config.js if not exists
    if [ ! -f "tailwind.config.js" ]; then
        cat > tailwind.config.js <<EOF
module.exports = {
  content: ['./index.html', './main.js'],
  theme: {
    extend: {},
  },
}
EOF
    fi

    npx tailwindcss -o "$VENDOR_DIR/tailwind.output.css" --minify
    echo "✓ Tailwind CSS built"
}

update_fonts() {
    echo "Downloading Inter font..."
    # Download font CSS
    curl -fsSL -o "$VENDOR_DIR/inter-font.css" \
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"

    # Parse and download font files (simplified version)
    echo "Note: You may need to manually download .woff2 files from Google Fonts"
    echo "✓ Font CSS downloaded"
}

update_version_file() {
    echo "Updating VERSION.txt..."
    cat > "$VENDOR_DIR/VERSION.txt" <<EOF
Vue.js: ${VUE_VERSION} (updated: $(date +%Y-%m-%d))
MQTT.js: ${MQTT_VERSION} (updated: $(date +%Y-%m-%d))
Tailwind CSS: built $(date +%Y-%m-%d)
Inter Font: 4.0 (static)

Last update: $(date)
EOF
    echo "✓ VERSION.txt updated"
}

# Main
COMPONENT="${1:-all}"

case "$COMPONENT" in
    vue)
        update_vue
        ;;
    mqtt)
        update_mqtt
        ;;
    tailwind)
        update_tailwind
        ;;
    fonts)
        update_fonts
        ;;
    all)
        update_vue
        update_mqtt
        update_tailwind
        update_fonts
        ;;
    *)
        echo "Unknown component: $COMPONENT"
        echo "Usage: $0 [vue|mqtt|tailwind|fonts|all]"
        exit 1
        ;;
esac

update_version_file

echo ""
echo "✅ Update complete!"
echo ""
echo "Next steps:"
echo "  1. Test in browser: http://localhost:8080"
echo "  2. Check console for errors"
echo "  3. Test all major features"
echo "  4. If OK: git add vendor/ && git commit -m 'chore: update vendor dependencies'"
echo "  5. If NG: git restore vendor/"
