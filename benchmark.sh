#!/bin/bash

# ============================================
#   Ollama Response Time Benchmark
#   Aapka App vs Ollama — Kaun Jeetega? 🏁
# ============================================

MODEL="qwen2.5-coder:latest"
PROMPT="Write a function to reverse a string in Python with explanation."
API_URL="http://localhost:11434/api/generate"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      OLLAMA BENCHMARK TEST 🏁            ║"
echo "║      Model: $MODEL     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

run_test() {
    local test_num=$1
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Test #$test_num chalu ho raha hai..."
    echo "📅 Start Time: $(date '+%H:%M:%S')"
    echo ""

    START=$(python3 -c "import time; print(int(time.time() * 1000))")

    # API call + response capture
    RESPONSE=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"$MODEL\",
            \"prompt\": \"$PROMPT\",
            \"stream\": false
        }")

    END=$(python3 -c "import time; print(int(time.time() * 1000))")

    # Time calculate karo
    TOTAL_MS=$((END - START))
    TOTAL_SEC=$(python3 -c "print(f'{$TOTAL_MS / 1000:.2f}')")

    # Tokens extract karo
    EVAL_COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('eval_count', 'N/A'))" 2>/dev/null)
    PROMPT_EVAL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('prompt_eval_count', 'N/A'))" 2>/dev/null)
    
    # Tokens per second
    if [[ "$EVAL_COUNT" =~ ^[0-9]+$ ]] && [ "$TOTAL_MS" -gt 0 ]; then
        TPS=$(python3 -c "print(f'{$EVAL_COUNT / ($TOTAL_MS / 1000):.1f}')")
    else
        TPS="N/A"
    fi

    echo "📅 End Time  : $(date '+%H:%M:%S')"
    echo ""
    echo "┌─────────────────────────────────────────┐"
    printf "│  ⏱️  Total Time    : %-6s seconds       │\n" "${TOTAL_SEC}"
    printf "│  ⏱️  Total Time    : %-6s ms             │\n" "${TOTAL_MS}"
    printf "│  📝 Output Tokens  : %-6s               │\n" "${EVAL_COUNT}"
    printf "│  📊 Speed          : %-6s tokens/sec    │\n" "${TPS}"
    echo "└─────────────────────────────────────────┘"
    echo ""
}

# 3 tests chalao
for i in 1 2 3; do
    run_test $i
    if [ $i -lt 3 ]; then
        echo "⏳ 2 seconds wait (cooling down)..."
        sleep 2
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Benchmark Complete!"
echo ""
echo "💡 Ab same prompt aapke app mein type karo"
echo "   aur dekho kaun jaldi respond karta hai!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
