import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ColorBrowser from "./components/ColorBrowser";
import ColorConsultant from "./components/ColorConsultant";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="nav-container">
          <div className="logo">
            <Link to="/">ColorSense AI</Link>
          </div>
          <div className="nav-links">
            <Link to="/browse">Browse Colors</Link>
            <Link to="/consultant">Chat with AI</Link>
          </div>
        </nav>

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <header className="hero-section">
                    <h1>Your Intelligent Paint Color Advisor</h1>
                    <p>Powered by AI and Benjamin Moore's Color Expertise</p>
                    <div className="cta-buttons">
                      <Link to="/browse" className="cta-button">
                        Browse Colors
                      </Link>
                      <Link to="/consultant" className="cta-button secondary">
                        Chat with AI
                      </Link>
                    </div>
                  </header>

                  <section className="features-section">
                    <div className="feature-card">
                      <h3>AI-Powered Recommendations</h3>
                      <p>
                        Get personalized color suggestions based on your
                        preferences
                      </p>
                    </div>
                    <div className="feature-card">
                      <h3>Color Collections</h3>
                      <p>Access Benjamin Moore's complete color catalog</p>
                    </div>
                    <div className="feature-card">
                      <h3>Smart Matching</h3>
                      <p>Find perfect color combinations for your space</p>
                    </div>
                  </section>

                  <section className="promo-section">
                    <div className="promo-content">
                      <h2>Jaykumar Suthar</h2>

                      <button
                        className="promo-button"
                        onClick={() =>
                          (window.location.href =
                            "https://officialjaipanchal.github.io/portfolio/")
                        }
                      >
                        Shop Now
                      </button>
                    </div>
                  </section>
                </>
              }
            />
            <Route path="/browse" element={<ColorBrowser />} />
            <Route path="/consultant" element={<ColorConsultant />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
