import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, PixelRatio, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import type { GroupMember } from './GroupScoreScreen';

export type MapHistoryItem = { id: string; name: string; lastSession: string; duration: string; pos: string; members: GroupMember[] };
type Coordinate = { latitude: number; longitude: number };
type MarkerHistoryItem = MapHistoryItem & Coordinate & { markerColor: string; resultLabel: string };

const MAP_2D_STYLE = 'mapbox://styles/bakedalaskatm/cmsaz8sne005a01rda3e5h6nd';
const MAP_3D_STYLE = 'mapbox://styles/bakedalaskatm/cmsazktg9005b01rd4zu12a64';
const SUCCESS_MARKER_COLOR = '#237050';
const FAIL_MARKER_COLOR = '#B32638';
const DEFAULT_MARKER_COLOR = '#15121F';
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const WON_ICON_URI = Image.resolveAssetSource(require('./assets/business.png')).uri;
const LOST_ICON_URI = Image.resolveAssetSource(require('./assets/wajaja.png')).uri;

const parsePosition = (pos: string): Coordinate | null => {
  const [latitude, longitude] = pos.split(',').map(Number);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
};

const getMarkerColor = (group: MapHistoryItem, profileName: string) => {
  const selectedMember = group.members.find((member) => member.name === profileName);
  if (!selectedMember || group.members.length === 0) return DEFAULT_MARKER_COLOR;
  return selectedMember.percentage <= 100 / group.members.length ? SUCCESS_MARKER_COLOR : FAIL_MARKER_COLOR;
};

const getResultLabel = (group: MapHistoryItem, profileName: string) => {
  const selectedMember = group.members.find((member) => member.name === profileName);
  if (!selectedMember || group.members.length === 0) return '';
  return selectedMember.percentage <= 100 / group.members.length ? 'You won!' : 'You lost!';
};

export function MapScreen({ history, profileName, onBack }: { history: MapHistoryItem[]; profileName: string; onBack: () => void }) {
  const devicePixelRatio = PixelRatio.get();
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mode, setMode] = useState<'2D' | '3D'>('2D');
  const markers = useMemo(
    () => history.flatMap((group) => {
      const coordinates = parsePosition(group.pos);
      return coordinates ? [{ ...group, ...coordinates, markerColor: getMarkerColor(group, profileName), resultLabel: getResultLabel(group, profileName) }] : [];
    }),
    [history, profileName],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) throw new Error('Location permission was not granted.');
        const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (mounted) setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude });
      } catch (error) {
        if (mounted) setLocationError(error instanceof Error ? error.message : 'Could not get your current location.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><StatusBar backgroundColor="#AAB7E9" barStyle="dark-content" /><View style={styles.loading}><ActivityIndicator color="#3E4AA0" size="large" /><Text style={styles.loadingText}>Finding your location...</Text></View></SafeAreaView>;
  }

  const style = mode === '3D' ? MAP_3D_STYLE : MAP_2D_STYLE;
  return <SafeAreaView style={styles.safeArea}><StatusBar backgroundColor="#AAB7E9" barStyle="dark-content" /><View style={styles.header}><Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>History</Text></Pressable><Text style={styles.headerTitle}>SESSION MAP</Text><View style={styles.headerSpacer} /></View><View style={styles.mapContainer}>{mapboxToken ? <WebView key={`${mode}-${devicePixelRatio}`} originWhitelist={['*']} source={{ html: buildMapHtml(markers, position, mapboxToken, style, mode, devicePixelRatio) }} style={styles.map} javaScriptEnabled domStorageEnabled /> : <View style={styles.message}><Text style={styles.messageTitle}>Mapbox token required</Text><Text style={styles.messageText}>Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to display the session map.</Text></View>}<View style={styles.toggle}><Pressable onPress={() => setMode('2D')} style={[styles.toggleButton, mode === '2D' && styles.toggleActive]}><Text style={[styles.toggleText, mode === '2D' && styles.toggleActiveText]}>2D</Text></Pressable><Pressable onPress={() => setMode('3D')} style={[styles.toggleButton, mode === '3D' && styles.toggleActive]}><Text style={[styles.toggleText, mode === '3D' && styles.toggleActiveText]}>3D</Text></Pressable></View></View>{locationError ? <Text style={styles.locationError}>{locationError} Showing saved session locations instead.</Text> : null}</SafeAreaView>;
}

function buildMapHtml(groups: MarkerHistoryItem[], userPosition: Coordinate | null, token: string, style: string, mode: '2D' | '3D', devicePixelRatio: number) {
  const sessions = {
    type: 'FeatureCollection',
    features: groups.map((group) => ({
      type: 'Feature',
      properties: { groupData: JSON.stringify(group), markerColor: group.markerColor },
      geometry: { type: 'Point', coordinates: [group.longitude, group.latitude] },
    })),
  };
  const center = userPosition ? [userPosition.longitude, userPosition.latitude] : groups.length ? [groups[0].longitude, groups[0].latitude] : [174.7633, -36.8485];
  const user = userPosition ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [userPosition.longitude, userPosition.latitude] } } : null;
  const pitch = mode === '3D' ? 55 : 0;

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.26.0/mapbox-gl.css" rel="stylesheet">
  <style>
    body{margin:0}#map{height:100vh}.mapboxgl-popup{max-width:340px!important}.mapboxgl-popup-content{background:transparent;box-shadow:none;padding:0}.mapboxgl-popup-tip{border-top-color:#F5EFDA}.mapboxgl-popup-close-button{font-size:22px;z-index:2}.card{background:#F5EFDA;border:2.5px solid #15121F;border-radius:18px;color:#15121F;font-family:Arial,sans-serif;min-width:245px;padding:16px}.heading,.summary,.score-head,.group-row{align-items:center;display:flex;justify-content:space-between}.title{align-items:center;display:flex;font-size:19px;font-weight:800;gap:5px;margin:0}.result-icon{height:25px;object-fit:contain;width:25px}.meta{color:rgba(21,18,31,.58);font-size:13px;font-weight:600;line-height:18px;margin:4px 0 0}.summary{border-top:1.5px solid rgba(21,18,31,.2);color:#3E4AA0;font-size:13px;font-weight:800;margin-top:14px;padding-top:13px}.scores{display:grid;gap:10px;margin-top:15px}.score-head{font-size:14px;font-weight:700;margin-bottom:6px}.bar{background:rgba(21,18,31,.14);border:1px solid #15121F;border-radius:7px;height:12px;overflow:hidden}.fill{border-radius:7px;height:100%}.group-button,.back{background:transparent;border:0;color:#15121F;cursor:pointer;font-family:Arial,sans-serif;text-align:left;width:100%}.group-button{border-top:1.5px solid rgba(21,18,31,.2);margin-top:12px;padding:12px 0 0}.back{color:#3E4AA0;font-size:13px;font-weight:800;padding:0;width:auto}.arrow{color:#3E4AA0;font-size:18px;font-weight:800}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.26.0/mapbox-gl.js"></script>
  <script>
    mapboxgl.accessToken=${JSON.stringify(token)};
    const sessions=${JSON.stringify(sessions)},user=${JSON.stringify(user)};
    const wonIcon=${JSON.stringify(WON_ICON_URI)},lostIcon=${JSON.stringify(LOST_ICON_URI)};
    let active=[],popup;
    const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const groupFrom=f=>JSON.parse(f.properties.groupData);
    const result=(g)=>g.resultLabel?' &bull; <span>'+esc(g.resultLabel)+'</span><img class="result-icon" src="'+(g.resultLabel==='You won!'?wonIcon:lostIcon)+'" alt="">':'';
    const detail=(g,canReturn)=>'<div class="card"><div class="heading"><h3 class="title">'+esc(g.name)+result(g)+'</h3>'+(canReturn?'<button class="back" onclick="window.showPicker()">All groups</button>':'')+'</div><p class="meta">'+esc(g.lastSession)+' - '+esc(g.duration)+'</p><div class="summary"><span>'+g.members.length+' members</span></div><div class="scores">'+g.members.map(m=>'<div><div class="score-head"><span>'+esc(m.name)+'</span><span>'+m.percentage+'%</span></div><div class="bar"><div class="fill" style="width:'+m.percentage+'%;background:'+esc(m.color)+'"></div></div></div>').join('')+'</div></div>';
    const picker=items=>'<div class="card"><div class="heading"><h3 class="title">choose a group</h3></div><p class="meta">'+items.length+' sessions at this location</p>'+items.map((g,i)=>'<button class="group-button" onclick="window.showGroup('+i+')"><span class="group-row"><span><strong>'+esc(g.name)+'</strong><br><span class="meta">'+esc(g.lastSession)+' - '+esc(g.duration)+'</span></span><span class="arrow">></span></span></button>').join('')+'</div>';
    window.showGroup=i=>popup.setHTML(detail(active[i],true));
    window.showPicker=()=>popup.setHTML(picker(active));
    const open=(coordinates,items)=>{active=items;popup=new mapboxgl.Popup({offset:16,maxWidth:'340px'}).setLngLat(coordinates).setHTML(items.length===1?detail(items[0],false):picker(items)).addTo(map)};
    const map=new mapboxgl.Map({container:'map',style:${JSON.stringify(style)},center:${JSON.stringify(center)},pitch:${pitch},zoom:user?14:12,pixelRatio:${JSON.stringify(devicePixelRatio)}});
    map.addControl(new mapboxgl.NavigationControl(),'top-right');
    map.on('load',()=>{
      map.addSource('sessions',{type:'geojson',data:sessions,cluster:true,clusterMaxZoom:14,clusterRadius:48});
      map.addLayer({id:'clusters',type:'circle',source:'sessions',filter:['has','point_count'],paint:{'circle-color':'#3E4AA0','circle-radius':['step',['get','point_count'],20,5,25,15,31],'circle-stroke-width':2,'circle-stroke-color':'#F5EFDA'}});
      map.addLayer({id:'cluster-count',type:'symbol',source:'sessions',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['DIN Offc Pro Medium','Arial Unicode MS Bold'],'text-size':12},paint:{'text-color':'#F5EFDA'}});
      map.addLayer({id:'session-points',type:'circle',source:'sessions',filter:['!', ['has','point_count']],paint:{'circle-color':['get','markerColor'],'circle-radius':9,'circle-stroke-width':3,'circle-stroke-color':'#F5EFDA'}});
      map.on('click','clusters',e=>{const f=map.queryRenderedFeatures(e.point,{layers:['clusters']})[0],source=map.getSource('sessions');source.getClusterLeaves(f.properties.cluster_id,f.properties.point_count,0,(error,leaves)=>{if(!error)open(f.geometry.coordinates,leaves.map(groupFrom));});});
      map.on('click','session-points',e=>{const f=e.features[0];open(f.geometry.coordinates,[groupFrom(f)]);});
      if(user){map.addSource('current-user',{type:'geojson',data:{type:'FeatureCollection',features:[user]}});map.addLayer({id:'current-user-marker',type:'circle',source:'current-user',paint:{'circle-color':'#53B7A8','circle-radius':10,'circle-stroke-color':'#FFF','circle-stroke-width':3}});}
    });
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#AAB7E9', flex: 1 }, header: { alignItems: 'center', borderBottomColor: '#15121F', borderBottomWidth: 2, flexDirection: 'row', justifyContent: 'space-between', minHeight: 64, paddingHorizontal: 16 }, back: { color: '#3E4AA0', fontSize: 15, fontWeight: '800', width: 90 }, headerTitle: { color: '#15121F', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, headerSpacer: { width: 90 }, mapContainer: { flex: 1 }, map: { flex: 1 }, toggle: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 12, borderWidth: 2, flexDirection: 'row', left: 14, padding: 3, position: 'absolute', top: 14 }, toggleButton: { borderRadius: 8, paddingHorizontal: 13, paddingVertical: 7 }, toggleActive: { backgroundColor: '#15121F' }, toggleText: { color: '#15121F', fontSize: 12, fontWeight: '800' }, toggleActiveText: { color: '#F5EFDA' }, loading: { alignItems: 'center', flex: 1, gap: 14, justifyContent: 'center' }, loadingText: { color: '#15121F', fontSize: 15, fontWeight: '700' }, message: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 }, messageTitle: { color: '#15121F', fontSize: 20, fontWeight: '800' }, messageText: { color: 'rgba(21,18,31,0.65)', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' }, locationError: { backgroundColor: '#F5EFDA', color: '#15121F', fontSize: 12, fontWeight: '600', lineHeight: 17, padding: 12, textAlign: 'center' },
});
