import ReactDOM from 'react-dom/client';
import { PlugWalletProvider } from './hooks/usePlugWallet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getWhitelistForPlug, getHostForPlug } from './config';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

// Initialize the app with configuration
const initializeApp = async () => {
    const whitelist = await getWhitelistForPlug();
    const host = await getHostForPlug();

    ReactDOM.createRoot(document.getElementById('root')!).render(
        <QueryClientProvider client={queryClient}>
            <PlugWalletProvider whitelist={whitelist} host={host}>
                <App />
            </PlugWalletProvider>
        </QueryClientProvider>
    );
};

initializeApp().catch(console.error);

