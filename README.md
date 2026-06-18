# LogicSim ⚡

A free, browser-based **logic gate circuit simulator** inspired by [LogicSim](https://www.logicsim.com). Build digital circuits, compute binary results, and learn boolean algebra — all in your browser, no install required.

![LogicSim](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS_4-38bdf8) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 1. Circuit Simulator
- **12 gate types:** AND, OR, NOT, NAND, NOR, XOR, XNOR + INPUT switch, OUTPUT LED, HIGH/LOW constants, CLOCK
- **Drag-and-drop** gates from the palette onto a dot-grid canvas
- **Wire by dragging** from an output pin to an input pin (bezier curves)
- **Live signal propagation** — wires turn green when signal is 1, gray when 0
- **Click INPUT gates** to toggle; **CLOCK gate** has Run/Step controls
- **Auto-generated truth table** for all input combinations
- **Auto-derived boolean expression** for each output (e.g. `Q = (A AND B)`)
- **3 example circuits:** Half Adder, De Morgan's Law Demo, SR Latch
- **Save/Load** circuits as JSON files
- **Inspector panel** to edit labels, toggle values, delete gates

### 2. Binary Calculator
- **12 bitwise operations:** AND, OR, XOR, NAND, NOR, XNOR, NOT A, NOT B, shifts, add, subtract
- **4 input bases:** binary, octal, decimal, hex
- **5 bit widths:** 4/8/16/32/64-bit (two's complement for negatives)
- **Live conversion** of operands to bin/dec/hex/octal
- **Per-bit visualization** with colored blocks

### 3. Boolean Laws Reference
- **11 law categories:** Identity, Null, Idempotent, Complement, Involution, Commutative, Associative, Distributive, Absorption, De Morgan's, Consensus
- **Searchable** + category filter chips
- Each identity shows `expression → simplified form` with explanation
- Quick-reference card for operators (·, +, ¬, ⊕, ↑, ↓)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or [Bun](https://bun.sh)
- npm / pnpm / bun (any package manager)

### Install & Run
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/logicsim.git
cd logicsim

# Install dependencies (use one of)
npm install
# or
bun install

# Start the dev server
npm run dev
# or
bun run dev
```

Open **http://localhost:3000** in your browser.

### Build for Production
```bash
npm run build
npm run start
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand |
| Logic Engine | Custom (pure TypeScript, client-side) |
| Icons | Lucide |

## 📖 How to Use

### Building a Circuit
1. Click a gate in the **Gate Palette** (left sidebar) to add it to the canvas
2. **Drag** gates to reposition them
3. **Drag from an output pin** (right side of a gate, the colored circle) **to an input pin** (left side of another gate) to create a wire
4. **Click an INPUT gate** to toggle its value (0 ↔ 1)
5. Watch wires light up **green** when the signal is 1
6. The **Truth Table** on the right updates automatically
7. The **Boolean Expression** for each output is derived automatically

### Loading Examples
Click **Examples** in the left sidebar → choose Half Adder, De Morgan Demo, or SR Latch.

### Saving Your Work
- **Save:** Click the Save button to download your circuit as a `.json` file
- **Load:** Click Load to upload a previously saved `.json` file
- **Clear:** Removes all gates and wires from the canvas

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main page with 3 tabs
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind + theme variables
├── components/
│   ├── logic/
│   │   ├── GateSymbol.tsx    # SVG rendering for all gates
│   │   ├── GateNode.tsx      # Interactive gate wrapper
│   │   ├── Wire.tsx          # Wire rendering
│   │   ├── CircuitCanvas.tsx # The main drawing surface
│   │   ├── GatePalette.tsx   # Left sidebar gate list
│   │   ├── InspectorPanel.tsx# Right sidebar (truth table, etc.)
│   │   ├── LogicSimulator.tsx# Combines all simulator components
│   │   ├── BinaryCalculator.tsx
│   │   ├── BooleanLaws.tsx
│   │   └── CircuitDevtools.tsx
│   └── ui/                   # shadcn/ui components
├── lib/
│   └── logic/
│       ├── types.ts          # Core type definitions
│       ├── gates.ts          # Gate definitions (AND, OR, etc.)
│       ├── simulator.ts      # Circuit simulation engine
│       ├── booleanLaws.ts    # Boolean law reference data
│       └── binaryCalc.ts     # Binary calculator utilities
└── store/
    └── circuitStore.ts       # Zustand state store
```

## 🧠 How the Simulator Works

The simulation engine in `src/lib/logic/simulator.ts` uses **iterative propagation**:

1. Initialize all **source gates** (INPUT, HIGH, LOW, CLOCK) with their values
2. For each **non-source gate**, gather input signals from connected wires
3. Compute the gate's output via its `evaluate()` function
4. Repeat until no values change (stable circuit) or max iterations reached
5. The truth table generator enumerates all `2^n` input combinations and runs the simulator for each

Feedback loops (like the SR Latch) are handled with a 1000-iteration cap to prevent infinite loops.

## 📝 License

MIT License — see [LICENSE](LICENSE) for details. Free to use, modify, and distribute.

## 🙏 Acknowledgments

- Inspired by [LogicSim](https://www.logicsim.com) and [Logisim](http://www.cburch.com/logisim/)
- Built with the amazing [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), and [shadcn/ui](https://ui.shadcn.com) projects
- Gate symbols follow standard IEEE 91-1984 conventions

## 💡 Roadmap (possible future features)

- [ ] Export circuit as PNG/SVG
- [ ] Multi-bit input/output buses
- [ ] Subcircuit (custom block) support
- [ ] Step-by-step simulation debugger
- [ ] Karnaugh map visualization
- [ ] Circuit sharing via URL

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

Made with ⚡ by [Your Name](https://github.com/YOUR_USERNAME)
