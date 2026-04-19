import { useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ActivityFeed } from "./components/ActivityFeed";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { BorrowerDashboardPage } from "./pages/BorrowerDashboardPage";
import { LenderPositionsPage } from "./pages/LenderPositionsPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import type { ActivityEventInput, ActivityItem } from "./types/app";
import { shortAddress } from "./utils/format";

function App() {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  function addActivity(item: ActivityEventInput) {
    setActivity((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          ...item,
        },
        ...current,
      ].slice(0, 20),
    );
  }

  async function connectWallet() {
    setWalletError(null);
    try {
      if (!window.solana?.isPhantom) {
        throw new Error(
          "Phantom wallet not found. Install Phantom extension to connect.",
        );
      }

      const response = await window.solana.connect();
      const wallet = response.publicKey.toString();
      setConnectedWallet(wallet);
      addActivity({
        title: "Wallet connected",
        details: `Connected ${shortAddress(wallet)}`,
        tone: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setWalletError(message);
      addActivity({
        title: "Wallet connection failed",
        details: message,
        tone: "danger",
      });
    }
  }

  async function disconnectWallet() {
    try {
      await window.solana?.disconnect();
    } catch {
      // Ignore disconnect failures from browser wallet providers.
    }
    setConnectedWallet(null);
    addActivity({
      title: "Wallet disconnected",
      details: "Manual disconnect triggered",
      tone: "neutral",
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>SaathiLoan MVP Console</h1>
          <p>Chain-powered lending views for hackathon demo mode</p>
        </div>
        <nav className="nav">
          <NavLink to="/marketplace">Marketplace</NavLink>
          <NavLink to="/borrower">Borrower Dashboard</NavLink>
          <NavLink to="/lender">Lender Positions</NavLink>
          <NavLink to="/admin">Admin Panel</NavLink>
        </nav>
        <div className="wallet-row">
          <p className="wallet-status">
            {connectedWallet
              ? `Connected wallet: ${shortAddress(connectedWallet)}`
              : "Wallet not connected"}
          </p>
          <div className="inline-actions">
            {!connectedWallet ? (
              <button
                className="btn btn-primary"
                onClick={() => void connectWallet()}
              >
                Connect Phantom
              </button>
            ) : (
              <button className="btn" onClick={() => void disconnectWallet()}>
                Disconnect Wallet
              </button>
            )}
          </div>
          {walletError ? <p className="state error">{walletError}</p> : null}
        </div>
      </header>
      <main className="dashboard-grid">
        <Routes>
          <Route path="/" element={<Navigate replace to="/marketplace" />} />
          <Route
            path="/marketplace"
            element={<MarketplacePage onEvent={addActivity} />}
          />
          <Route
            path="/borrower"
            element={
              <BorrowerDashboardPage
                connectedWallet={connectedWallet}
                onEvent={addActivity}
              />
            }
          />
          <Route
            path="/lender"
            element={
              <LenderPositionsPage
                connectedWallet={connectedWallet}
                onEvent={addActivity}
              />
            }
          />
          <Route
            path="/admin"
            element={<AdminPanelPage onEvent={addActivity} />}
          />
        </Routes>
        <ActivityFeed items={activity} />
      </main>
    </div>
  );
}

export default App;
