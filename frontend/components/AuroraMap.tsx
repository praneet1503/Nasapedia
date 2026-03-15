'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'

import type { AuroraBand } from '../lib/aurora-types'

type AuroraMapProps = {
  northBand: AuroraBand
  southBand: AuroraBand
  focusSignal?: number
}

function toRing(band: AuroraBand): L.LatLngTuple[] {
  if (!band.equator_edge.length || !band.pole_edge.length) {
    return []
  }

  const equatorEdge = band.equator_edge.map(([lat, lon]) => [lat, lon] as L.LatLngTuple)
  const poleEdge = [...band.pole_edge]
    .reverse()
    .map(([lat, lon]) => [lat, lon] as L.LatLngTuple)

  return [...equatorEdge, ...poleEdge]
}

export default function AuroraMap({ northBand, southBand, focusSignal }: AuroraMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const northLayerRef = useRef<L.LayerGroup | null>(null)
  const southLayerRef = useRef<L.LayerGroup | null>(null)

  const northRing = useMemo(() => toRing(northBand), [northBand])
  const southRing = useMemo(() => toRing(southBand), [southBand])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 2,
      maxZoom: 6,
      preferCanvas: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView([20, 0], 2)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.stop()
      map.remove()
      mapRef.current = null
      northLayerRef.current = null
      southLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    northLayerRef.current?.remove()
    southLayerRef.current?.remove()
    northLayerRef.current = null
    southLayerRef.current = null

    if (northRing.length > 2) {
      const northGroup = L.layerGroup()
      L.polygon(northRing, {
        color: '#00ff66',
        opacity: 0.35,
        fillColor: '#00ff66',
        fillOpacity: 0.1,
        weight: 4,
      }).addTo(northGroup)
      L.polygon(northRing, {
        color: '#7cffb8',
        opacity: 0.95,
        fillColor: '#3dff96',
        fillOpacity: 0.28,
        weight: 2,
      }).addTo(northGroup)
      northGroup.addTo(map)
      northLayerRef.current = northGroup
    }

    if (southRing.length > 2) {
      const southGroup = L.layerGroup()
      L.polygon(southRing, {
        color: '#00ff66',
        opacity: 0.35,
        fillColor: '#00ff66',
        fillOpacity: 0.1,
        weight: 4,
      }).addTo(southGroup)
      L.polygon(southRing, {
        color: '#7cffb8',
        opacity: 0.95,
        fillColor: '#3dff96',
        fillOpacity: 0.28,
        weight: 2,
      }).addTo(southGroup)
      southGroup.addTo(map)
      southLayerRef.current = southGroup
    }
  }, [northRing, southRing])

  useEffect(() => {
    if (typeof focusSignal === 'undefined') return
    const map = mapRef.current
    if (!map) return

    try {
      map.setView([20, 0], 2, { animate: true })
    } catch {
      // Ignore map interruptions during teardown.
    }
  }, [focusSignal])

  return (
    <div className="iss-map-shell">
      <div ref={mapContainerRef} className="iss-map" />
      <div className="iss-map-overlay">
        <span>Aurora Oval Projection</span>
      </div>
    </div>
  )
}
