import { Outlet, Route, Routes } from 'react-router-dom';
import { Hero } from './components/Hero';
import { HeroHeader } from './components/HeroHeader';
import { LandingContent } from './components/LandingContent';
import { ScrollToHash } from './components/ScrollToHash';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
// import { Shop } from './pages/Shop';
import { Checkout } from './pages/Checkout';
import { Account } from './pages/Account';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { DashboardHome } from './pages/admin/DashboardHome';
import { JewelryList } from './pages/admin/JewelryList';
import { JewelryForm } from './pages/admin/JewelryForm';
import { OrdersList } from './pages/admin/OrdersList';
import { SettingsPage } from './pages/admin/SettingsPage';
import { InvoiceList } from './pages/admin/InvoiceList';
import { InvoiceDetail } from './pages/admin/InvoiceDetail';
import { CounterSale } from './pages/admin/CounterSale';
import { ExpensesList } from './pages/admin/ExpensesList';
import { ExpenseForm } from './pages/admin/ExpenseForm';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';

function Home() {
  return (
    <>
      <Hero fmt={() => ''} onOpenBespoke={() => {}} />
      <LandingContent />
    </>
  );
}

function StorefrontLayout() {
  return (
    <>
      <ScrollToHash />
      <HeroHeader />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<Home />} />
        {/* <Route path="/shop" element={<Shop />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/account" element={<Account />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="jewelries" element={<JewelryList />} />
        <Route path="jewelries/new" element={<JewelryForm />} />
        <Route path="jewelries/:id/edit" element={<JewelryForm />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/new" element={<CounterSale />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="expenses" element={<ExpensesList />} />
        <Route path="expenses/new" element={<ExpenseForm />} />
        <Route path="expenses/:id/edit" element={<ExpenseForm />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
