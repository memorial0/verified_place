// 외국인 대회 방문객 시연용 파일럿 데이터 (이름 키).
// 라이브 적용은 0014_seed_visitor_pilot.sql(id 기준). 이 모듈은 Supabase 미연결
// 로컬 폴백(RESTAURANT_DATASET)에서 동일 체험을 재현하기 위한 것 — 이름으로 매칭.
// 두 곳의 노트/주의/상황/지역대 값은 동일하게 유지한다.

export interface VisitorPilotEntry {
  noteEn: string
  warningEn: string
  situation: string
  area: string
}

export const VISITOR_PILOT: Record<string, VisitorPilotEntry> = {
  '춘천명물닭갈비': { noteEn: "Chuncheon's signature dak-galbi (stir-fried chicken), cooked at your table — great for groups.", warningEn: 'Sauce is spicy and contains chicken. Ask for a milder option if needed.', situation: 'team_dinner', area: 'downtown' },
  '샘밭막국수': { noteEn: 'Long-loved local buckwheat noodle (makguksu) restaurant.', warningEn: 'Cold buckwheat noodles; broth may contain meat or fish. Please ask staff if vegetarian.', situation: 'family', area: 'lakeside' },
  '실비막국수': { noteEn: 'Simple, well-known makguksu spot near the city center.', warningEn: 'Broth may contain meat or fish stock. Please confirm with staff.', situation: 'quick_meal', area: 'downtown' },
  '봄담은산채': { noteEn: 'Korean set meals featuring wild mountain vegetables (sanchae).', warningEn: 'Side dishes vary; some may contain seafood or pork. Please ask.', situation: 'family', area: 'south_chuncheon' },
  '우리순대국': { noteEn: 'Hearty Korean blood-sausage soup (sundae-guk).', warningEn: 'Contains pork. Not suitable if you do not eat pork.', situation: 'quick_meal', area: 'downtown' },
  '약사촌 닭갈비': { noteEn: 'Popular dak-galbi house, good for larger tables.', warningEn: 'Spicy chicken dish. Ask for a mild option if needed.', situation: 'team_dinner', area: 'downtown' },
  '행복한두부': { noteEn: 'Home-style tofu dishes.', warningEn: 'Some menus contain pork or seafood. Please ask staff.', situation: 'family', area: 'downtown' },
  '강남동 골목원조닭갈비': { noteEn: 'Classic alley dak-galbi restaurant.', warningEn: 'Spicy; contains chicken.', situation: 'team_dinner', area: 'downtown' },
  '호반식당': { noteEn: 'Large local restaurant suitable for groups.', warningEn: 'Menu includes pork and seafood. Please confirm ingredients.', situation: 'team_dinner', area: 'downtown' },
  '와송칼국수': { noteEn: 'Handmade knife-cut noodle soup (kalguksu) in the Myeongdong area.', warningEn: 'Broth may contain seafood or meat. Please ask.', situation: 'quick_meal', area: 'downtown' },
  '수제돈가스': { noteEn: 'Handmade pork cutlet (donkatsu).', warningEn: 'Contains pork. Not suitable if you do not eat pork.', situation: 'quick_meal', area: 'downtown' },
  '진미감자탕순대국': { noteEn: 'Pork-bone stew (gamjatang) and sundae soup.', warningEn: 'Contains pork. Not suitable if you do not eat pork.', situation: 'after_match', area: 'south_chuncheon' },
  '(주)춘천장어마을': { noteEn: 'Grilled freshwater eel restaurant.', warningEn: 'Grilled eel; sauces may contain soy or alcohol. Please ask.', situation: 'family', area: 'lakeside' },
  '동해막국수퇴계점': { noteEn: 'Makguksu restaurant in the Toegye area.', warningEn: 'Broth may contain meat or fish stock. Please confirm.', situation: 'quick_meal', area: 'station' },
  '명동산골닭갈비': { noteEn: 'Dak-galbi on the central Myeongdong dining street.', warningEn: 'Spicy; contains chicken.', situation: 'team_dinner', area: 'downtown' },
  '유미닭갈비': { noteEn: 'Well-known dak-galbi spot.', warningEn: 'Spicy chicken dish.', situation: 'team_dinner', area: 'downtown' },
  '우성닭갈비본점': { noteEn: 'Spacious dak-galbi restaurant, good for teams.', warningEn: 'Spicy; contains chicken.', situation: 'team_dinner', area: 'south_chuncheon' },
  '유포리막국수': { noteEn: 'Country-style makguksu restaurant.', warningEn: 'Broth may contain meat or fish. Please ask.', situation: 'family', area: 'lakeside' },
  '샘토숯불닭갈비남춘천역점': { noteEn: 'Charcoal dak-galbi near Namchuncheon Station.', warningEn: 'Spicy; contains chicken.', situation: 'before_match', area: 'station' },
  '조약돌숯불닭갈비': { noteEn: 'Charcoal-grilled dak-galbi.', warningEn: 'Spicy; contains chicken.', situation: 'team_dinner', area: 'downtown' },
  '학곡리막국수닭갈비': { noteEn: 'Serves both makguksu and dak-galbi.', warningEn: 'Spicy options; broth may contain meat or fish.', situation: 'family', area: 'downtown' },
  '만나돈가스': { noteEn: 'Casual Japanese-style pork cutlet (donkatsu) restaurant.', warningEn: 'Contains pork. Not suitable if you do not eat pork.', situation: 'quick_meal', area: 'downtown' },
}
