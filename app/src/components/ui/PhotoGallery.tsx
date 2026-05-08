import React, { useRef, useState } from 'react'
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native'
import { colors } from '../../theme/colors'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PHOTO_HEIGHT = 280
const PLACEHOLDER = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800'

interface PhotoGalleryProps {
  photos: string[]
  height?: number
}

export function PhotoGallery({ photos, height = PHOTO_HEIGHT }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const sources = photos.length > 0 ? photos : [PLACEHOLDER]

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    setActiveIndex(index)
  }

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        data={sources}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={[styles.photo, { height }]} resizeMode="cover" />
        )}
      />
      {sources.length > 1 && (
        <View style={styles.dots}>
          {sources.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
  },
  photo: {
    width: SCREEN_WIDTH,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
  },
})
