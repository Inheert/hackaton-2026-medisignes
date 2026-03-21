import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

type TlaOption = {
  id: number;
  label: string;
  source: number;
};

const TLA_IMAGES: TlaOption[] = [
  {
    id: 1,
    label: 'Image 1 · question',
    source: require('@/assets/tla_pics/question.png'),
  },
  {
    id: 2,
    label: 'Image 2 · non',
    source: require('@/assets/tla_pics/non.png'),
  },
  {
    id: 3,
    label: 'Image 3 · regarder',
    source: require('@/assets/tla_pics/regarder.png'),
  },
  {
    id: 4,
    label: 'Image 4 · paques',
    source: require('@/assets/tla_pics/paques.png'),
  },
  {
    id: 5,
    label: 'Image 5 · hat',
    source: require('@/assets/tla_pics/hat.png'),
  },
  {
    id: 6,
    label: 'Image 6 · toi',
    source: require('@/assets/tla_pics/toi.png'),
  },
  {
    id: 7,
    label: 'Image 7 · oui',
    source: require('@/assets/tla_pics/oui.png'),
  },
  {
    id: 8,
    label: 'Image 8 · chocolat',
    source: require('@/assets/tla_pics/chocolat.png'),
  },
  {
    id: 9,
    label: 'Image 9 · tete chauve',
    source: require('@/assets/tla_pics/tete chauve.png'),
  },
  {
    id: 10,
    label: 'Image 10 · tete',
    source: require('@/assets/tla_pics/tete.png'),
  },
  {
    id: 11,
    label: 'Image 11 · ventre',
    source: require('@/assets/tla_pics/ventre.png'),
  },
  {
    id: 12,
    label: 'Image 12 · bras',
    source: require('@/assets/tla_pics/bras.png'),
  },
  {
    id: 13,
    label: 'Image 13 · dos',
    source: require('@/assets/tla_pics/dos.png'),
  },
  {
    id: 14,
    label: 'Image 14 · pied',
    source: require('@/assets/tla_pics/pied.png'),
  },
  {
    id: 15,
    label: 'Image 15 · jambe',
    source: require('@/assets/tla_pics/jambe.png'),
  },
  {
    id: 16,
    label: 'Image 16 · plus',
    source: require('@/assets/tla_pics/plus.png'),
  },
  {
    id: 17,
    label: 'Image 17 · moins',
    source: require('@/assets/tla_pics/moins.png'),
  },
];

const STEP_ONE_IMAGE = TLA_IMAGES[0];
const STEP_TWO_SECOND_IMAGE = TLA_IMAGES[1];
const STEP_TWO_SEVENTH_IMAGE = TLA_IMAGES[6];
const STEP_TWO_OPTIONS = [STEP_TWO_SECOND_IMAGE, STEP_TWO_SEVENTH_IMAGE];
const STEP_THREE_EIGHTH_IMAGE = TLA_IMAGES[7];
const STEP_FOUR_IMAGES = TLA_IMAGES.slice(-6);

function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    /* horrible vert*/
    <ThemedView lightColor="#F8FCFA" darkColor="#0c2f18" style={styles.stepCard}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.stepDescription}>{description}</ThemedText>
      {children}
    </ThemedView>
  );
}

function ImageTile({
  option,
  onPress,
  isSelected = false,
  compact = false,
  tiny = false,
  showLabel = true,
}: {
  option: TlaOption;
  onPress?: () => void;
  isSelected?: boolean;
  compact?: boolean;
  tiny?: boolean;
  showLabel?: boolean;
}) {
  const content = (
    <>
      <Image
        source={option.source}
        contentFit="contain"
        style={[styles.image, compact && styles.imageCompact, tiny && styles.imageTiny]}
      />
      {showLabel ? <ThemedText style={styles.imageLabel}>{option.label}</ThemedText> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.imageTile, compact && styles.imageTileCompact, tiny && styles.imageTileTiny]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.imageTile,
        compact && styles.imageTileCompact,
        tiny && styles.imageTileTiny,
        isSelected && styles.imageTileSelected,
        pressed && styles.imageTilePressed,
      ]}>
      {content}
    </Pressable>
  );
}

export default function TlaScreen() {
  const [isStepOneComplete, setIsStepOneComplete] = useState(false);
  const [stepOneSelection, setStepOneSelection] = useState<number | null>(null);
  const [stepTwoSelection, setStepTwoSelection] = useState<number | null>(null);
  const didChooseSecondImage = stepTwoSelection === STEP_TWO_SECOND_IMAGE.id;
  const didChooseSeventhImage = stepTwoSelection === STEP_TWO_SEVENTH_IMAGE.id;

  const handleStepOnePress = (imageNumber: number) => {
    setStepOneSelection(imageNumber);
    setIsStepOneComplete(true);
    setStepTwoSelection(null);
  };

  const handleStepTwoPress = (imageId: number) => {
    setStepTwoSelection(imageId);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#830fa0', dark: '#df0f0f' }}
      headerImage={
        <ThemedView lightColor="#32d77f" darkColor="#213ac8" style={styles.headerBadge}>
          <ThemedText style={styles.headerText}>TLA</ThemedText>
        </ThemedView>
      }>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          TLA
        </ThemedText>
        <ThemedText style={styles.description}>
          Parcours visuel avec embranchement selon l’image choisie.
        </ThemedText>

        <StepSection
          title="Étape 1"
          description="Avez vous mal?">
          <View style={styles.stepOneGrid}>
            {Array.from({ length: 9 }, (_, index) => (
              <ImageTile
                key={`${STEP_ONE_IMAGE.id}-${index}`}
                option={STEP_ONE_IMAGE}
                onPress={() => handleStepOnePress(index + 1)}
                isSelected={stepOneSelection === index + 1}
                tiny
                showLabel={false}
              />
            ))}
          </View>
        </StepSection>

        {isStepOneComplete ? (
          <StepSection
            title="Étape 2"
            description="As-tu mal?">
            {stepOneSelection !== null ? (
              <ThemedText style={styles.selectionText}>
                Image cliquée : {stepOneSelection}
              </ThemedText>
            ) : null}
            <View style={styles.grid}>
              {STEP_TWO_OPTIONS.map((option) => (
                <ImageTile
                  key={option.id}
                  option={option}
                  compact
                  onPress={() => handleStepTwoPress(option.id)}
                  isSelected={stepTwoSelection === option.id}
                />
              ))}
            </View>
          </StepSection>
        ) : null}

        {didChooseSecondImage ? (
          <StepSection
            title="Étape 3"
            description="">
            <>
              <ImageTile option={STEP_THREE_EIGHTH_IMAGE} />
              <ThemedText style={styles.endText}>Prends du chocolat</ThemedText>
            </>
          </StepSection>
        ) : null}

        {didChooseSeventhImage ? (
          <StepSection
            title="Étape 4"
            description="où avez vous mal?">
            <View style={styles.grid}>
              {STEP_FOUR_IMAGES.map((option) => (
                <ImageTile key={option.id} option={option} compact />
              ))}
            </View>
          </StepSection>
        ) : null}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerBadge: {
    width: 170,
    height: 170,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: 40,
    transform: [{ rotate: '-8deg' }],
  },
  headerText: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#e3e013',
  },
  content: {
    gap: 18,
  },
  title: {
    textAlign: 'center',
    fontFamily: Fonts.rounded,
  },
  description: {
    textAlign: 'center',
    opacity: 0.8,
  },
  stepCard: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },
  stepTitle: {
    textAlign: 'center',
    fontFamily: Fonts.rounded,
  },
  stepDescription: {
    textAlign: 'center',
    opacity: 0.78,
  },
  selectionText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#ff00e6', //horrible rose
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stepOneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageTile: {
    width: '100%',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D6E6DC',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  imageTileCompact: {
    width: '48%',
  },
  imageTileTiny: {
    width: '31%',
    padding: 8,
  },
  imageTileSelected: {
    borderColor: '#2A9D8F',
    shadowColor: '#2A9D8F',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  imageTilePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: '100%',
    height: 220,
  },
  imageCompact: {
    height: 150,
  },
  imageTiny: {
    height: 90,
  },
  imageLabel: {
    textAlign: 'center',
    fontWeight: '600',
  },
  endText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#68dd3a',
  },
});

/*
Niveau de douleur
où avez vous mal? --> jambes, ventre, tête
depuis quand? --> heures, jour, mois
quels symptômes? --> 
*/