// Type declarations for the `astronomia` package (no official @types available)
// These are minimal declarations covering the specific APIs used in ephemeris.ts

declare module 'astronomia' {
  export namespace julian {
    function CalendarGregorianToJD(year: number, month: number, day: number): number;
    function DateToJD(date: Date): number;
  }

  export namespace sidereal {
    /** Returns Greenwich Apparent Sidereal Time as a fraction of a day */
    function apparent(jd: number): number;
    function apparent0UT(jd: number): number;
    function mean(jd: number): number;
    function mean0UT(jd: number): number;
  }

  export namespace solar {
    function apparentVSOP87(earth: planetposition.Planet, jd: number): { lon: number; lat: number; range: number };
  }

  export namespace planetposition {
    class Planet {
      constructor(vsop87data: object);
      position(jd: number): { lon: number; lat: number; range: number };
    }
  }

  export namespace moonposition {
    function position(jd: number): { lon: number; lat: number; range: number };
  }

  export namespace nutation {
    function nutation(jd: number): { deltaPsi: number; deltaEps: number };
    function meanObliquity(jd: number): number;
  }
}

declare module 'astronomia/data' {
  const data: {
    default: {
      earth: unknown;
      jupiter: unknown;
      mars: unknown;
      mercury: unknown;
      neptune: unknown;
      saturn: unknown;
      uranus: unknown;
      venus: unknown;
      vsop87Bearth: unknown;
      vsop87Bjupiter: unknown;
      vsop87Bmars: unknown;
      vsop87Bmercury: unknown;
      vsop87Bneptune: unknown;
      vsop87Bsaturn: unknown;
      vsop87Buranus: unknown;
      vsop87Bvenus: unknown;
      [key: string]: unknown;
    };
  };
  export = data;
}
