import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutGrid,
  MoreHorizontal,
  Apple,
  Milk,
  Cookie,
  CupSoda,
  Headphones,
  Sparkles,
  HeartPulse,
  Gift,
  Snowflake,
  Croissant,
  Wheat,
  Flame,
  Home,
  Baby,
  PawPrint,
  Package
} from 'lucide-react';
import { categoriesAPI } from '../api/api';
import '../styles/TopCategoryStrip.css';

const getCategoryIconComponent = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('vegetable') || n.includes('fruit') || n.includes('fresh')) return Apple;
  if (n.includes('dairy') || n.includes('milk') || n.includes('egg')) return Milk;
  if (n.includes('snack') || n.includes('chip') || n.includes('namkeen') || n.includes('munchie')) return Cookie;
  if (n.includes('drink') || n.includes('juice') || n.includes('tea') || n.includes('coffee') || n.includes('cola')) return CupSoda;
  if (n.includes('electronic') || n.includes('appliance') || n.includes('gadget') || n.includes('audio')) return Headphones;
  if (n.includes('beauty') || n.includes('personal') || n.includes('care') || n.includes('makeup') || n.includes('grooming')) return Sparkles;
  if (n.includes('pharma') || n.includes('wellness') || n.includes('medicine') || n.includes('health')) return HeartPulse;
  if (n.includes('gift') || n.includes('paan') || n.includes('celebration')) return Gift;
  if (n.includes('winter') || n.includes('ice') || n.includes('frozen')) return Snowflake;
  if (n.includes('bakery') || n.includes('biscuit') || n.includes('sweet') || n.includes('chocolate') || n.includes('bread')) return Croissant;
  if (n.includes('atta') || n.includes('rice') || n.includes('dal') || n.includes('breakfast') || n.includes('organic')) return Wheat;
  if (n.includes('masala') || n.includes('oil') || n.includes('ghee') || n.includes('sauce') || n.includes('spice')) return Flame;
  if (n.includes('clean') || n.includes('home') || n.includes('office') || n.includes('kitchen')) return Home;
  if (n.includes('baby')) return Baby;
  if (n.includes('pet')) return PawPrint;
  return Package;
};

const getShortCategoryLabel = (name = '') => {
  const clean = name.trim();
  if (!clean) return 'Category';
  const map = [
    [/vegetables?\s*(&|and)?\s*fruits?/i, 'Fruits & Veg'],
    [/dairy,?\s*bread\s*(&|and)?\s*eggs?/i, 'Dairy & Bread'],
    [/chips\s*(&|and)?\s*namkeen|snacks\s*(&|and)?\s*munchies/i, 'Snacks'],
    [/cold\s*drinks?\s*(&|and)?\s*juices?/i, 'Beverages'],
    [/oil,?\s*ghee\s*(&|and)?\s*masala|masala,?\s*oil/i, 'Oil & Masala'],
    [/atta,?\s*rice\s*(&|and)?\s*dal/i, 'Atta & Dal'],
    [/bakery\s*(&|and)?\s*biscuits?/i, 'Bakery'],
    [/tea,?\s*coffee/i, 'Tea & Coffee'],
    [/breakfast\s*(&|and)?\s*instant/i, 'Breakfast'],
    [/personal\s*care|beauty/i, 'Beauty'],
    [/electronics?/i, 'Electronics'],
    [/pharma|wellness/i, 'Pharmacy'],
    [/cleaning/i, 'Cleaning'],
    [/sweet\s*tooth|chocolate/i, 'Sweets'],
    [/home\s*(&|and)?\s*office/i, 'Home'],
  ];
  for (const [regex, short] of map) {
    if (regex.test(clean)) return short;
  }
  if (clean.length <= 13) return clean;
  return clean.split(/[&,]/)[0].trim().slice(0, 14);
};

const TopCategoryStrip = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stripRef = useRef(null);

  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    let active = true;
    categoriesAPI
      .getAll()
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setCategories(list);
        try {
          localStorage.setItem('cached_categories', JSON.stringify(list));
        } catch {}
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const showStrip = location.pathname === '/' || location.pathname === '/products';
  if (!showStrip) return null;

  const selectedCatId = location.pathname === '/products' ? searchParams.get('category') || '' : '';
  const isAllActive = location.pathname === '/' || (location.pathname === '/products' && !selectedCatId);

  const handleSelectAll = () => {
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (catId) => {
    navigate(`/products?category=${catId}`);
  };

  return (
    <div className="top-category-strip-wrapper" aria-label="Quick Categories">
      <div className="top-category-strip-scroll" ref={stripRef}>
        <button
          type="button"
          className={`top-cat-tab top-cat-all-tab ${isAllActive ? 'active' : ''}`}
          onClick={handleSelectAll}
        >
          <span className="top-cat-icon-box">
            <LayoutGrid size={20} strokeWidth={isAllActive ? 2.2 : 1.8} />
          </span>
          <span className="top-cat-label">All</span>
        </button>

        {categories.map((cat) => {
          const isActive = selectedCatId === cat._id;
          const IconComp = getCategoryIconComponent(cat.name);
          const shortLabel = getShortCategoryLabel(cat.name);
          const lower = (cat.name || '').toLowerCase();
          const toneClass =
            lower.includes('vegetable') || lower.includes('fruit') || lower.includes('fresh')
              ? 'tone-green'
              : lower.includes('snack') || lower.includes('chip') || lower.includes('namkeen')
              ? 'tone-amber'
              : '';

          return (
            <button
              key={cat._id}
              type="button"
              className={`top-cat-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectCategory(cat._id)}
              title={cat.name}
            >
              <span className={`top-cat-icon-box ${toneClass}`}>
                <IconComp size={20} strokeWidth={isActive ? 2.2 : 1.75} />
              </span>
              <span className="top-cat-label">{shortLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="top-cat-tab"
          onClick={() => navigate('/products')}
          title="More categories"
        >
          <span className="top-cat-icon-box">
            <MoreHorizontal size={20} strokeWidth={2} />
          </span>
          <span className="top-cat-label">More</span>
        </button>
      </div>
    </div>
  );
};

export default TopCategoryStrip;

