import { useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiUpload, ApiError } from '../../api/client';
import { JEWELRY_CATEGORIES as CATEGORIES } from '../../lib/categories';

// Mirrors the backend's rounding (src/utils/pricing.ts) so this live preview
// matches the price customers will actually see.
const roundToNearest50 = (n: number) => Math.ceil(n / 50 - 1e-9) * 50;

export function JewelryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('rings');
  const [silverWeightGrams, setSilverWeightGrams] = useState('');
  const [pricingMode, setPricingMode] = useState<'makingCharge' | 'totalCost'>('makingCharge');
  const [makingCharge, setMakingCharge] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [stoneWeightGrams, setStoneWeightGrams] = useState('');
  const [stonePrice, setStonePrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [silverRate, setSilverRate] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    apiGet('/settings').then((settings) => setSilverRate(Number(settings.silverRatePerGram)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    apiGet(`/jewelries/${id}`).then((jewelry) => {
      setName(jewelry.name);
      setCategory(jewelry.category);
      setSilverWeightGrams(String(jewelry.silverWeightGrams));
      setMakingCharge(String(jewelry.makingCharge));
      setStoneWeightGrams(jewelry.stoneWeightGrams !== null ? String(jewelry.stoneWeightGrams) : '');
      setStonePrice(jewelry.stonePrice !== null ? String(jewelry.stonePrice) : '');
      setExistingImageUrl(jewelry.imageUrl);
      setLoading(false);
    });
  }, [id, isEdit]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const weight = parseFloat(silverWeightGrams) || 0;
  const silverCost = weight * silverRate;
  const previewMakingCharge = pricingMode === 'totalCost'
    ? (parseFloat(totalCost) || 0) - silverCost
    : parseFloat(makingCharge) || 0;
  const previewTotal = roundToNearest50(
    pricingMode === 'makingCharge'
      ? silverCost + (parseFloat(makingCharge) || 0)
      : parseFloat(totalCost) || 0,
  );
  const stoneCost = parseFloat(stonePrice) || 0;
  const estimatedCost = silverCost + stoneCost + previewMakingCharge;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('silverWeightGrams', silverWeightGrams);
    formData.append('pricingMode', pricingMode);
    if (pricingMode === 'makingCharge') formData.append('makingCharge', makingCharge);
    else formData.append('totalCost', totalCost);
    if (stoneWeightGrams) formData.append('stoneWeightGrams', stoneWeightGrams);
    if (stonePrice) formData.append('stonePrice', stonePrice);
    if (imageFile) formData.append('image', imageFile);

    try {
      if (isEdit) await apiUpload(`/jewelries/${id}`, 'PUT', formData);
      else await apiUpload('/jewelries', 'POST', formData);
      navigate('/admin/jewelries');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save jewelry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-neutral-500">Loading…</div>;

  const currentImage = imagePreview || existingImageUrl;

  return (
    <div className="jewelry-editor">
      <button type="button" className="jewelry-editor-back" onClick={() => navigate('/admin/jewelries')}>
        <ArrowLeft size={16} />
        Back to jewelries
      </button>

      <header className="jewelry-editor-heading">
        <div>
          <p className="jewelry-editor-eyebrow">Inventory</p>
          <h1>{isEdit ? 'Edit jewelry' : 'Add new jewelry'}</h1>
          <p>{isEdit ? 'Update the product details and pricing.' : 'Create a polished product listing for your store.'}</p>
        </div>
        <span className="jewelry-editor-status">{isEdit ? 'Editing listing' : 'New listing'}</span>
      </header>

      {error && <div className="jewelry-editor-error">{error}</div>}

      <form onSubmit={submit} className="jewelry-editor-form">
        <section className="jewelry-editor-card jewelry-editor-details">
          <div className="jewelry-editor-card-heading">
            <span>01</span>
            <div>
              <h2>Product details</h2>
              <p>The information customers will see in your shop.</p>
            </div>
          </div>

          <div className="jewelry-field jewelry-field-wide">
            <label htmlFor="jf-name">Jewelry name</label>
            <input
              id="jf-name"
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Moonstone silver ring"
            />
          </div>

          <div className="jewelry-field">
            <label htmlFor="jf-category">Category</label>
            <select id="jf-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="jewelry-field">
            <label htmlFor="jf-weight">Silver weight</label>
            <div className="jewelry-input-suffix">
              <input
                id="jf-weight"
                name="silverWeightGrams"
                required
                type="number"
                step="0.001"
                min="0"
                value={silverWeightGrams}
                onChange={(event) => setSilverWeightGrams(event.target.value)}
                placeholder="0.000"
              />
              <span>grams</span>
            </div>
          </div>

          <div className="jewelry-field jewelry-field-wide">
            <label htmlFor="jf-image">Product image</label>
            <label className={`jewelry-image-upload ${currentImage ? 'has-image' : ''}`} htmlFor="jf-image">
              {currentImage ? (
                <img src={currentImage} alt="Jewelry preview" />
              ) : (
                <span className="jewelry-image-placeholder"><ImagePlus size={25} /></span>
              )}
              <span className="jewelry-image-copy">
                <strong>{imageFile ? imageFile.name : existingImageUrl ? 'Replace product image' : 'Choose a product image'}</strong>
                <small>PNG, JPG or WEBP · A square image works best</small>
              </span>
              <span className="jewelry-image-button">Browse</span>
            </label>
            <input
              className="jewelry-file-input"
              id="jf-image"
              name="image"
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            />
          </div>
        </section>

        <section className="jewelry-editor-card jewelry-editor-pricing">
          <div className="jewelry-editor-card-heading">
            <span>02</span>
            <div>
              <h2>Pricing</h2>
              <p>Set your margin and review the final price.</p>
            </div>
          </div>

          <div className="jewelry-rate-card">
            <span>Today’s silver rate</span>
            <strong>Rs {silverRate.toLocaleString()} <small>/ gram</small></strong>
            <div>
              <span>Silver value for this piece</span>
              <b>Rs {silverCost.toLocaleString()}</b>
            </div>
          </div>

          <div className="jewelry-pricing-mode">
            <label>How would you like to price it?</label>
            <div>
              <button
                type="button"
                onClick={() => setPricingMode('makingCharge')}
                className={pricingMode === 'makingCharge' ? 'active' : ''}
              >
                Making charge
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('totalCost')}
                className={pricingMode === 'totalCost' ? 'active' : ''}
              >
                Total price
              </button>
            </div>
          </div>

          <div className="jewelry-field">
            <label htmlFor="jf-price">{pricingMode === 'makingCharge' ? 'Making charge' : 'Total selling price'}</label>
            <div className="jewelry-input-prefix">
              <span>Rs</span>
              {pricingMode === 'makingCharge' ? (
                <input
                  id="jf-price"
                  name="makingCharge"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={makingCharge}
                  onChange={(event) => setMakingCharge(event.target.value)}
                  placeholder="0.00"
                />
              ) : (
                <input
                  id="jf-price"
                  name="totalCost"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalCost}
                  onChange={(event) => setTotalCost(event.target.value)}
                  placeholder="0.00"
                />
              )}
            </div>
          </div>

          <div className="jewelry-price-summary">
            <div><span>Silver value</span><b>Rs {silverCost.toLocaleString()}</b></div>
            <div><span>Making charge</span><b>Rs {previewMakingCharge.toLocaleString()}</b></div>
            <div className="total"><span>Customer price</span><strong>Rs {previewTotal.toLocaleString()}</strong></div>
          </div>

          {previewMakingCharge < 0 && (
            <div className="jewelry-price-warning">The total price is lower than the silver value. Please increase it.</div>
          )}
        </section>

        <section className="jewelry-editor-card">
          <div className="jewelry-editor-card-heading">
            <span>03</span>
            <div>
              <h2>Cost tracking</h2>
              <p>Internal only — not shown to customers or included in the price above.</p>
            </div>
          </div>

          <div className="jewelry-editor-details">
            <div className="jewelry-field">
              <label htmlFor="jf-stone-weight">Stone weight</label>
              <div className="jewelry-input-suffix">
                <input
                  id="jf-stone-weight"
                  type="number"
                  step="0.001"
                  min="0"
                  value={stoneWeightGrams}
                  onChange={(event) => setStoneWeightGrams(event.target.value)}
                  placeholder="Optional"
                />
                <span>grams</span>
              </div>
            </div>

            <div className="jewelry-field">
              <label htmlFor="jf-stone-price">Stone price</label>
              <div className="jewelry-input-prefix">
                <span>Rs</span>
                <input
                  id="jf-stone-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stonePrice}
                  onChange={(event) => setStonePrice(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="jewelry-price-summary">
            <div><span>Est. total cost (silver + stone + making)</span><b>Rs {estimatedCost.toLocaleString()}</b></div>
          </div>
        </section>

        <footer className="jewelry-editor-actions">
          <p>You can edit this listing again at any time.</p>
          <div>
            <button type="button" onClick={() => navigate('/admin/jewelries')} className="jewelry-cancel-button">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || previewMakingCharge < 0}
              className="jewelry-submit-button"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add jewelry'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
