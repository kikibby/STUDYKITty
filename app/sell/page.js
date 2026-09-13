'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selling, setSelling] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'error' | 'success', text }

  // ---------------- Load products for the dropdown ----------------

  async function loadProducts() {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setStatusMsg({ type: 'error', text: 'โหลดรายการสินค้าไม่สำเร็จ: ' + error.message });
    } else {
      setProducts(data || []);
      // Auto-select the first product once loaded, if nothing selected yet
      if (data && data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id);
      }
    }
    setLoadingProducts(false);
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Currently selected product object (for price / stock / name lookups)
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const parsedQuantity = Number(quantity) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * parsedQuantity : 0;

  function resetForm() {
    setQuantity('1');
    // keep the same product selected for convenience when selling multiple items in a row
  }

  // ---------------- Handle sale ----------------

  async function handleSell(e) {
    e.preventDefault();
    setStatusMsg(null);

    if (!selectedProduct) {
      setStatusMsg({ type: 'error', text: 'กรุณาเลือกสินค้า' });
      return;
    }
    if (parsedQuantity <= 0) {
      setStatusMsg({ type: 'error', text: 'กรุณากรอกจำนวนที่จะขายให้ถูกต้อง' });
      return;
    }
    if (parsedQuantity > selectedProduct.stock) {
      setStatusMsg({
        type: 'error',
        text: `สินค้าคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit || ''})`,
      });
      return;
    }

    setSelling(true);

    // 1) Insert the sale record
    const { error: saleError } = await supabase.from('sales').insert([
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: parsedQuantity,
        total_price: totalPrice,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (saleError) {
      setSelling(false);
      setStatusMsg({ type: 'error', text: 'บันทึกการขายไม่สำเร็จ: ' + saleError.message });
      return;
    }

    // 2) Deduct stock on the product
    const newStock = selectedProduct.stock - parsedQuantity;
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id);

    setSelling(false);

    if (stockError) {
      // The sale was recorded but stock update failed — flag this clearly so it can be fixed manually.
      setStatusMsg({
        type: 'error',
        text: 'บันทึกการขายแล้ว แต่ปรับสต็อกไม่สำเร็จ: ' + stockError.message,
      });
      return;
    }

    setStatusMsg({
      type: 'success',
      text: `ขาย "${selectedProduct.name}" จำนวน ${parsedQuantity} ${selectedProduct.unit || ''} สำเร็จ`,
    });
    resetForm();
    loadProducts(); // refresh stock numbers shown in the dropdown
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>
      <p className="subtitle">เลือกสินค้า กรอกจำนวน แล้วกดยืนยันเพื่อบันทึกการขาย</p>

      <div className="card">
        {loadingProducts ? (
          <p className="empty-state">กำลังโหลดรายการสินค้า...</p>
        ) : products.length === 0 ? (
          <p className="empty-state">ยังไม่มีสินค้าในระบบ กรุณาเพิ่มสินค้าที่หน้าแรกก่อน</p>
        ) : (
          <form onSubmit={handleSell}>
            <div className="form-row">
              <label htmlFor="product">สินค้า</label>
              <select
                id="product"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Number(p.price).toLocaleString('th-TH')} บาท (คงเหลือ {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="quantity">จำนวน</label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {/* ---------- Auto-calculated total ---------- */}
            <div
              className="form-row"
              style={{
                background: '#fafafc',
                border: '1px solid #e3e5ea',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>ราคาต่อหน่วย</span>
                <span>
                  {selectedProduct ? Number(selectedProduct.price).toLocaleString('th-TH') : 0} บาท
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  marginTop: 8,
                }}
              >
                <span>ยอดรวม</span>
                <span>{totalPrice.toLocaleString('th-TH')} บาท</span>
              </div>
            </div>

            <button type="submit" disabled={selling}>
              {selling ? 'กำลังบันทึก...' : 'ขาย'}
            </button>

            {statusMsg && (
              <p className={`status-msg ${statusMsg.type}`}>{statusMsg.text}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
