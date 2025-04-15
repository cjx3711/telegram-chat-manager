import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import ZipCombiner from "./components/ZipCombiner";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0088cc", // Telegram's primary blue color
    },
    secondary: {
      main: "#179cde",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ZipCombiner />
    </ThemeProvider>
  );
}

export default App;
