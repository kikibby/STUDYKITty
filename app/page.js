'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Empty shape for the "add new product" form
const EMPTY_FORM = { sku: '', name: '', price: '', stock: '', unit: '' };

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'error' | 'success', text }

  const [newProduct, setNewProduct] = useState(EMPTY_FORM);
  const [savingNew, setSavingNew] = useState(false);

  const [editingId, setEditingId] = useState(null); // id of row currently in edit mode
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  // ---------------- Load products ----------------

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setStatusMsg({ type: 'error', text: 'โหลดรายการสินค้าไม่สำเร็จ: ' + error.message });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // ---------------- Add product ----------------

  function handleNewChange(e) {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setStatusMsg(null);

    if (!newProduct.sku.trim() || !newProduct.name.trim()) {
      setStatusMsg({ type: 'error', text: 'กรุณากรอก SKU และชื่อสินค้า' });
      return;
    }

    setSavingNew(true);
    const { error } = await supabase.from('products').insert([
      {
        sku: newProduct.sku.trim(),
        name: newProduct.name.trim(),
        price: Number(newProduct.price) || 0,
        stock: Number(newProduct.stock) || 0,
        unit: newProduct.unit.trim(),
      },
    ]);
    setSavingNew(false);

    if (error) {
      setStatusMsg({ type: 'error', text: 'เพิ่มสินค้าไม่สำเร็จ: ' + error.message });
      return;
    }

    setStatusMsg({ type: 'success', text: 'เพิ่มสินค้าเรียบร้อย' });
    setNewProduct(EMPTY_FORM);
    loadProducts();
  }

  // ---------------- Inline edit ----------------

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      sku: product.sku ?? '',
      name: product.name ?? '',
      price: product.price ?? '',
      stock: product.stock ?? '',
      unit: product.unit ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveEdit(id) {
    setSavingEdit(true);
    const { error } = await supabase
      .from('products')
      .update({
        sku: editForm.sku.trim(),
        name: editForm.name.trim(),
        price: Number(editForm.price) || 0,
        stock: Number(editForm.stock) || 0,
        unit: editForm.unit.trim(),
      })
      .eq('id', id);
    setSavingEdit(false);

    if (error) {
      setStatusMsg({ type: 'error', text: 'บันทึกการแก้ไขไม่สำเร็จ: ' + error.message });
      return;
    }

    setStatusMsg({ type: 'success', text: 'บันทึกการแก้ไขเรียบร้อย' });
    cancelEdit();
    loadProducts();
  }

  // ---------------- Delete ----------------

  async function handleDelete(id) {
    const confirmed = window.confirm('ต้องการลบสินค้านี้ใช่หรือไม่?');
    if (!confirmed) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      setStatusMsg({ type: 'error', text: 'ลบสินค้าไม่สำเร็จ: ' + error.message });
      return;
    }

    setStatusMsg({ type: 'success', text: 'ลบสินค้าเรียบร้อย' });
    loadProducts();
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>
      <p className="subtitle">จัดการสินค้าทั้งหมดของร้าน เพิ่ม แก้ไข หรือลบได้จากหน้านี้</p>

      {/* ---------- Add product form ---------- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>เพิ่มสินค้าใหม่</h2>
        <form onSubmit={handleAddProduct}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
            }}
          >
            <div className="form-row">
              <label htmlFor="sku">SKU</label>
              <input
                id="sku"
                name="sku"
                value={newProduct.sku}
                onChange={handleNewChange}
                placeholder="SK-001"
              />
            </div>
            <div className="form-row">
              <label htmlFor="name">ชื่อสินค้า</label>
              <input
                id="name"
                name="name"
                value={newProduct.name}
                onChange={handleNewChange}
                placeholder="สมุดโน้ตพรีเมียม"
              />
            </div>
            <div className="form-row">
              <label htmlFor="price">ราคา</label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={newProduct.price}
                onChange={handleNewChange}
                placeholder="159"
              />
            </div>
            <div className="form-row">
              <label htmlFor="stock">คงเหลือ</label>
              <input
                id="stock"
                name="stock"
                type="number"
                min="0"
                value={newProduct.stock}
                onChange={handleNewChange}
                placeholder="20"
              />
            </div>
            <div className="form-row">
              <label htmlFor="unit">หน่วย</label>
              <input
                id="unit"
                name="unit"
                value={newProduct.unit}
                onChange={handleNewChange}
                placeholder="ชิ้น"
              />
            </div>
          </div>
          <button type="submit" disabled={savingNew}>
            {savingNew ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
          </button>
        </form>

        {statusMsg && (
          <p className={`status-msg ${statusMsg.type}`}>{statusMsg.text}</p>
        )}
      </div>

      {/* ---------- Products table ---------- */}
      <div className="card">
        <h2>สินค้าทั้งหมด ({products.length})</h2>

        {loading ? (
          <p className="empty-state">กำลังโหลด...</p>
        ) : products.length === 0 ? (
          <p className="empty-state">ยังไม่มีสินค้าในระบบ</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>ชื่อสินค้า</th>
                <th>ราคา</th>
                <th>คงเหลือ</th>
                <th>หน่วย</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isEditing = editingId === product.id;

                if (isEditing) {
                  // ---- inline edit row ----
                  return (
                    <tr key={product.id}>
                      <td>
                        <input name="sku" value={editForm.sku} onChange={handleEditChange} />
                      </td>
                      <td>
                        <input name="name" value={editForm.name} onChange={handleEditChange} />
                      </td>
                      <td>
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          value={editForm.price}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          name="stock"
                          type="number"
                          value={editForm.stock}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input name="unit" value={editForm.unit} onChange={handleEditChange} />
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEdit(product.id)} disabled={savingEdit}>
                          {savingEdit ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                        <button onClick={cancelEdit} style={{ background: '#8a90a0' }}>
                          ยกเลิก
                        </button>
                      </td>
                    </tr>
                  );
                }

                // ---- normal display row ----
                return (
                  <tr key={product.id}>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{Number(product.price).toLocaleString('th-TH')}</td>
                    <td>{product.stock}</td>
                    <td>{product.unit}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => startEdit(product)}>แก้ไข</button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        style={{ background: '#c0435a' }}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
