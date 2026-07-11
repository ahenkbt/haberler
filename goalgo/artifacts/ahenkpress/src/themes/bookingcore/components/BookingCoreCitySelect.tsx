import { useTourismCities } from "../hooks/useTourismListings";

type Props = {
  value: string;
  onChange: (city: string) => void;
  type?: string;
  label?: string;
  id?: string;
};

export function BookingCoreCitySelect({ value, onChange, type, label = "Destinasyon", id }: Props) {
  const { cities } = useTourismCities(type);

  return (
    <label>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bc-city-select"
      >
        <option value="">Tüm şehirler</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
