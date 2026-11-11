import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  const categories = db.prepare(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all();

  return NextResponse.json({ success: true, categories });
}

export async function POST(req: NextRequest) {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description } = body || {};

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama kategori wajib diisi.' }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Kategori dengan nama atau slug serupa sudah ada.' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, status)
      VALUES (?, ?, ?, 'active')
    `).run(name.trim(), slug, description ? description.trim() : null);

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil ditambahkan.',
      category: { id: Number(result.lastInsertRowid), name: name.trim(), slug, description, status: 'active' }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

