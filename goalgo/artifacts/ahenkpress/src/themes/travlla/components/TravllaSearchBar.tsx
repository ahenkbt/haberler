import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { TRV } from "../travllaPaths";

type Props = {
  initialCity?: string;
  initialGuests?: string;
};

export function TravllaSearchBar({ initialCity = "", initialGuests = "2" }: Props) {
  const [, navigate] = useLocation();
  const [city, setCity] = useState(initialCity);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(initialGuests);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (city.trim()) q.set("city", city.trim());
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (guests) q.set("guests", guests);
    navigate(`${TRV.turlar}${q.toString() ? `?${q}` : ""}`);
  }

  return (
    <div className="trv-search-wrap">
      <div className="container">
        <form className="trv-search-card" onSubmit={onSubmit}>
          <div className="trv-search-grid">
            <div className="trv-field">
              <label>Destinasyon</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Şehir veya bölge"
              />
            </div>
            <div className="trv-field">
              <label>Giriş tarihi</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="trv-field">
              <label>Çıkış tarihi</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn} />
            </div>
            <div className="trv-field">
              <label>Yolcu</label>
              <select value={guests} onChange={(e) => setGuests(e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} kişi
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="site-button trv-search-submit">
              <i className="fa-solid fa-magnifying-glass" /> Tur Ara
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
