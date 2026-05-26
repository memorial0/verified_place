// 네이버 지도 위에 React 컴포넌트를 띄우기 위한 커스텀 오버레이.
// 카카오 react-kakao-maps-sdk 의 <CustomOverlayMap> 을 대체한다.
// naver.maps.OverlayView 는 SDK 로드 후에만 존재하므로, 런타임에 1회 서브클래싱한다.

export interface ReactOverlayOptions {
  position: any // naver.maps.LatLng
  element: HTMLElement
  /** 가로 앵커 (0=왼쪽, 0.5=가운데, 1=오른쪽). 기본 0.5 */
  xAnchor?: number
  /** 세로 앵커 (0=위, 1=아래가 좌표에 닿음). 카카오 yAnchor 와 동일 의미. 기본 1 */
  yAnchor?: number
  zIndex?: number
}

let OverlayClass: any = null

export function getReactOverlayClass(naver: any) {
  if (OverlayClass) return OverlayClass

  class ReactOverlay extends naver.maps.OverlayView {
    private _position: any
    private _element: HTMLElement
    private _xAnchor: number
    private _yAnchor: number

    constructor(opts: ReactOverlayOptions) {
      super()
      this._position = opts.position
      this._element = opts.element
      this._xAnchor = opts.xAnchor ?? 0.5
      this._yAnchor = opts.yAnchor ?? 1
      const s = this._element.style
      s.position = 'absolute'
      if (opts.zIndex != null) s.zIndex = String(opts.zIndex)
    }

    onAdd() {
      // floatPane: 최상단 + 포인터 이벤트 허용 → 마커/팝업 클릭 동작
      this.getPanes().floatPane.appendChild(this._element)
    }

    draw() {
      const projection = this.getProjection()
      if (!projection) return
      const px = projection.fromCoordToOffset(this._position)
      const s = this._element.style
      s.left = `${px.x}px`
      s.top = `${px.y}px`
      s.transform = `translate(${-this._xAnchor * 100}%, ${-this._yAnchor * 100}%)`
    }

    onRemove() {
      const el = this._element
      if (el.parentNode) el.parentNode.removeChild(el)
    }

    setPosition(position: any) {
      this._position = position
      this.draw()
    }
  }

  OverlayClass = ReactOverlay
  return OverlayClass
}
