'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'error', text }

  // ---------------- Load sales, newest first ----------------

  async function loadSales() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setStatusMsg({ type: 'error', text: 'โหลดประวัติการขายไม่สำเร็จ: ' + error.message });
    } else {
      setSales(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSales();
  }, []);

  // Total revenue across all sale records currently loaded
  const totalRevenue = useMemo(
    () => sales.reduce((sum, sale) => sum + Number(sale.total_price || 0), 0),
    [sales]
  );

  function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>
      <p className="subtitle">รายการขายทั้งหมด เรียงจากล่าสุดไปเก่าสุด</p>

      {/* ---------- Total revenue summary ---------- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#5b6270', fontWeight: 600 }}>ยอดขายรวมทั้งหมด</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            {totalRevenue.toLocaleString('th-TH')} บาท
          </span>
        </div>
      </div>

      {statusMsg && <p className={`status-msg ${statusMsg.type}`}>{statusMsg.text}</p>}

      {/* ---------- Sales table ---------- */}
      <div className="card">
        <h2>รายการขาย ({sales.length})</h2>

        {loading ? (
          <p className="empty-state">กำลังโหลด...</p>
        ) : sales.length === 0 ? (
          <p className="empty-state">ยังไม่มีรายการขาย</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>วันเวลาที่ขาย</th>
                <th>ชื่อสินค้า</th>
                <th>จำนวน</th>
                <th>ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDateTime(sale.sold_at)}</td>
                  <td>{sale.product_name}</td>
                  <td>{sale.quantity}</td>
                  <td>{Number(sale.total_price).toLocaleString('th-TH')} บาท</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
