/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY: Dark Charcoal (Heading, text, primary dark)
        charcoal: '#2D2D2D',
        
        // SECONDARY: Gold/Brass (Accents, highlights)
        gold: '#B8A05A',
        
        // BACKGROUND: Cream/Beige
        cream: '#FDFBF7',
        beige: {
          light: '#F9F7F2',
          lighter: '#F5F2EB',
          lighter2: '#F4F1EA',
          border: '#EBE7DE',
        },
        
        // FRAME COLOR
        frame: '#d4b886',
      },
    },
  },
  plugins: [],
}