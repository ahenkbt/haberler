import { useEffect, useState } from "react";

import { Redirect, useSearch } from "wouter";

import { SearchEnginePublicChrome } from "@/components/SearchEnginePublicChrome";

import Kesfet from "./Kesfet";



export default function HaritalarRoute() {

  const search = useSearch();

  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));



  useEffect(() => {

    const syncMobile = () => setIsMobile(window.innerWidth < 768);

    syncMobile();

    window.addEventListener("resize", syncMobile);

    return () => window.removeEventListener("resize", syncMobile);

  }, []);



  if (isMobile) {

    const query = search.trim() ? `?${search.replace(/^\?/, "")}` : "";

    return <Redirect to={`/map${query}`} replace />;

  }



  return (

    <SearchEnginePublicChrome

      fullBleed

      mapEmbed

      searchPlaceholder="Harita, işletme veya adres ara"

    >

      <Kesfet layout="desktop-chrome" />

    </SearchEnginePublicChrome>

  );

}


