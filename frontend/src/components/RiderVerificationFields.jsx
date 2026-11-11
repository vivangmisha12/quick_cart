import React, { useState } from 'react';
import {
  Bike,
  FileText,
  CreditCard,
  MapPin,
  Store,
  Crosshair,
  Phone,
  ShieldCheck,
} from 'lucide-react';

export const RIDER_HUB_OPTIONS = [
  {
    value: 'Dark Store #04 • Vibhuti Khand',
    label: 'Dark Store #04 • Vibhuti Khand, Gomti Nagar',
    lat: 26.8602,
    lng: 81.0068,
    area: 'Vibhuti Khand, Gomti Nagar, Lucknow',
  },
  {
    value: 'Dark Store #07 • Indira Nagar',
    label: 'Dark Store #07 • Sector 16, Indira Nagar',
    lat: 26.8851,
    lng: 80.9924,
    area: 'Sector 16, Indira Nagar, Lucknow',
  },
  {
    value: 'Dark Store #02 • Hazratganj',
    label: 'Dark Store #02 • MG Marg, Hazratganj',
    lat: 26.8467,
    lng: 80.9462,
    area: 'MG Marg, Hazratganj, Lucknow',
  },
  {
    value: 'Dark Store #11 • Aliganj',
    label: 'Dark Store #11 • Kapurthala, Aliganj',
    lat: 26.8906,
    lng: 80.9421,
    area: 'Kapurthala Crossing, Aliganj, Lucknow',
  },
  {
    value: 'Dark Store #09 • Alambagh',
    label: 'Dark Store #09 • Phoenix Road, Alambagh',
    lat: 26.8142,
    lng: 80.9036,
    area: 'Alambagh Crossing, Lucknow',
  },
];

const RiderVerificationFields = ({ form, onChange, onLocationDetected }) => {
  const [detectingGps, setDetectingGps] = useState(false);

  const handleHubChange = (e) => {
    const val = e.target.value;
    const hub = RIDER_HUB_OPTIONS.find((h) => h.value === val);
    onChange('assignedHub', val);
    if (hub && !form.gpsLocked) {
      onLocationDetected({
        lat: hub.lat,
        lng: hub.lng,
        area: hub.area,
        gpsLocked: false,
      });
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('GPS geolocation is not supported on this device.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onLocationDetected({
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
          area: form.area || `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          gpsLocked: true,
        });
        setDetectingGps(false);
      },
      () => {
        const hub = RIDER_HUB_OPTIONS.find((h) => h.value === form.assignedHub) || RIDER_HUB_OPTIONS[0];
        onLocationDetected({
          lat: hub.lat,
          lng: hub.lng,
          area: hub.area,
          gpsLocked: false,
        });
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="rider-kyc-fields-grid">
      <div className="delivery-form-row-2">
        <div className="delivery-input-group">
          <label>Vehicle Type</label>
          <div className="delivery-input-field">
            <Bike size={17} className="input-svg-icon" />
            <select
              value={form.vehicleType}
              onChange={(e) => onChange('vehicleType', e.target.value)}
            >
              <option value="bike">Motorcycle</option>
              <option value="scooter">Scooter / Activa</option>
              <option value="ev">Electric Scooter (EV)</option>
              <option value="cycle">E-Cycle</option>
            </select>
          </div>
        </div>

        <div className="delivery-input-group">
          <label>Vehicle Number *</label>
          <div className="delivery-input-field">
            <ShieldCheck size={17} className="input-svg-icon" />
            <input
              type="text"
              placeholder="e.g. UP-32-BK-2024"
              value={form.vehicleNumber}
              onChange={(e) => onChange('vehicleNumber', e.target.value.toUpperCase())}
              required
            />
          </div>
        </div>
      </div>

      <div className="delivery-input-group">
        <label>Driving License (DL) Number *</label>
        <div className="delivery-input-field">
          <FileText size={17} className="input-svg-icon" />
          <input
            type="text"
            placeholder="e.g. UP32 20210045123"
            value={form.drivingLicenseNumber}
            onChange={(e) => onChange('drivingLicenseNumber', e.target.value.toUpperCase())}
            required
          />
        </div>
      </div>

      <div className="delivery-form-row-2">
        <div className="delivery-input-group">
          <label>Govt ID Type</label>
          <div className="delivery-input-field">
            <FileText size={17} className="input-svg-icon" />
            <select value={form.idType} onChange={(e) => onChange('idType', e.target.value)}>
              <option value="Aadhaar">Aadhaar Card</option>
              <option value="PAN">PAN Card</option>
              <option value="VoterID">Voter ID</option>
            </select>
          </div>
        </div>

        <div className="delivery-input-group">
          <label>{form.idType || 'Govt'} ID Number *</label>
          <div className="delivery-input-field">
            <ShieldCheck size={17} className="input-svg-icon" />
            <input
              type="text"
              placeholder="Last 4 digits or ID no."
              value={form.idNumber}
              onChange={(e) => onChange('idNumber', e.target.value.toUpperCase())}
              required
            />
          </div>
        </div>
      </div>

      <div className="delivery-form-row-2">
        <div className="delivery-input-group">
          <label>UPI ID / Bank Account (Payouts)</label>
          <div className="delivery-input-field">
            <CreditCard size={17} className="input-svg-icon" />
            <input
              type="text"
              placeholder="e.g. rider@okaxis"
              value={form.bankOrUpi}
              onChange={(e) => onChange('bankOrUpi', e.target.value)}
            />
          </div>
        </div>

        <div className="delivery-input-group">
          <label>Emergency Contact</label>
          <div className="delivery-input-field">
            <Phone size={17} className="input-svg-icon" />
            <input
              type="tel"
              placeholder="Family / backup number"
              value={form.emergencyContact}
              onChange={(e) => onChange('emergencyContact', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="delivery-input-group">
        <label>Preferred Dark Store Zone</label>
        <div className="delivery-input-field">
          <Store size={17} className="input-svg-icon" />
          <select value={form.assignedHub} onChange={handleHubChange}>
            {RIDER_HUB_OPTIONS.map((hub) => (
              <option key={hub.value} value={hub.value}>
                {hub.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="delivery-gps-box">
        <div className="gps-box-info">
          <MapPin size={16} />
          <div>
            <strong>Base Location for Nearest Order Matching</strong>
            <span>
              {form.area || 'Vibhuti Khand, Lucknow'} ({form.lat?.toFixed(4)}, {form.lng?.toFixed(4)})
            </span>
          </div>
        </div>
        <button
          type="button"
          className="gps-detect-mini-btn"
          onClick={handleDetectGPS}
          disabled={detectingGps}
        >
          <Crosshair size={14} />
          <span>{detectingGps ? 'Locating...' : 'Detect GPS'}</span>
        </button>
      </div>
    </div>
  );
};

export default RiderVerificationFields;

