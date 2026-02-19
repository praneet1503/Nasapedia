'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'

type IssMapProps = {
  latitude: number
  longitude: number
  altitudeKm?: number | null
  focusSignal?: number
  focusAnimate?: boolean
}

const earthRadiusKm = 6371

const issIcon = L.divIcon({
  className: 'iss-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export default function IssMap({ latitude, longitude, altitudeKm, focusSignal, focusAnimate }: IssMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const mountedRef = useRef(false)
  const latestCenterRef = useRef<[number, number] | null>(null)
  const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude])

  const footprintRadiusMeters = useMemo(() => {
    if (typeof altitudeKm !== 'number') return null
    const horizonDistanceKm = Math.sqrt((earthRadiusKm + altitudeKm) ** 2 - earthRadiusKm ** 2)
    return Math.max(0, horizonDistanceKm * 1000)
  }, [altitudeKm])

  useEffect(() => {
    mountedRef.current = true
    if (!mapContainerRef.current) return
    if (mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 2,
      maxZoom: 7,
      preferCanvas: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView(center, 3)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    markerRef.current = L.marker(center, { icon: issIcon }).addTo(map)

    if (footprintRadiusMeters) {
      circleRef.current = L.circle(center, {
        radius: footprintRadiusMeters,
        color: '#00d4ff',
        fillColor: '#00d4ff',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map)
    }

    mapRef.current = map

    return () => {
      mountedRef.current = false
      map.stop()
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mountedRef.current) return
    if (!mapContainerRef.current?.isConnected) return

    // keep a ref to the latest center so focus/pan can read it
    latestCenterRef.current = center
    markerRef.current?.setLatLng(center)

    if (footprintRadiusMeters) {
      if (!circleRef.current) {
        circleRef.current = L.circle(center, {
          radius: footprintRadiusMeters,
          color: '#00d4ff',
          fillColor: '#00d4ff',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map)
      } else {
        circleRef.current.setLatLng(center)
        circleRef.current.setRadius(footprintRadiusMeters)
      }
    } else if (circleRef.current) {
      circleRef.current.remove()
      circleRef.current = null
    }
  }, [center, footprintRadiusMeters, latitude, longitude])

  useEffect(() => {
    if (typeof focusSignal === 'undefined') return
    const map = mapRef.current
    if (!map || !mountedRef.current) return
    if (!mapContainerRef.current?.isConnected) return
    try {
      const animate = typeof focusAnimate === 'boolean' ? focusAnimate : true
      const target = latestCenterRef.current ?? (center as [number, number])
      map.panTo(target as L.LatLngExpression, { animate })
    } catch (e) {
      /* ignore */
    }
  }, [focusSignal, focusAnimate])

  return (
    <div className="iss-map-shell">
      <div ref={mapContainerRef} className="iss-map" />
      <div className="iss-map-overlay">
        <span>ISS Ground Track</span>
      </div>
    </div>
  )
}
