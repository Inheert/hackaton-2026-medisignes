import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

type PainGuide = {
  id: 'low' | 'medium' | 'high';
  label: string;
  caption: string;
  source: number;
  maxValue: number;
};

type JourneyOption = {
  id: string;
  label: string;
  source: number;
};

const PAIN_VALUES = Array.from({ length: 11 }, (_, index) => index);
const PAIN_THUMB_SIZE = 42;
const PAIN_RULE_IMAGE = require('@/assets/tla_pics/regle.png');
const PAIN_GUIDES: PainGuide[] = [
  {
    id: 'low',
    label: '0-3',
    caption: 'Douleur faible',
    source: require('@/assets/tla_pics/greenguy.png'),
    maxValue: 3,
  },
  {
    id: 'medium',
    label: '4-6',
    caption: 'Douleur modérée',
    source: require('@/assets/tla_pics/yellowguy.png'),
    maxValue: 6,
  },
  {
    id: 'high',
    label: '7-10',
    caption: 'Douleur intense',
    source: require('@/assets/tla_pics/redguy.png'),
    maxValue: 10,
  },
];
const STEP_TWO_OPTIONS: JourneyOption[] = [
  {
    id: 'tete',
    label: 'tete',
    source: require('@/assets/tla_pics/tete.png'),
  },
  {
    id: 'ventre',
    label: 'ventre',
    source: require('@/assets/tla_pics/ventre.png'),
  },
  {
    id: 'jambes',
    label: 'jambes',
    source: require('@/assets/tla_pics/jambes.png'),
  },
];
const STEP_THREE_OPTIONS: JourneyOption[] = [
  {
    id: 'jours',
    label: 'jours',
    source: require('@/assets/tla_pics/jours.png'),
  },
  {
    id: 'heures',
    label: 'heures',
    source: require('@/assets/tla_pics/heures.png'),
  },
  {
    id: 'mois',
    label: 'mois',
    source: require('@/assets/tla_pics/mois.png'),
  },
];
const STEP_FOUR_OPTIONS: JourneyOption[] = [
  {
    id: 'constipation',
    label: 'constipation',
    source: require('@/assets/tla_pics/constipation.png'),
  },
  {
    id: 'vomissements',
    label: 'vomissements',
    source: require('@/assets/tla_pics/vomissements.png'),
  },
  {
    id: 'diarrhée',
    label: 'diarrhée',
    source: require('@/assets/tla_pics/diarrhée.png'),
  },
];

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <ThemedView lightColor="#F8FCFA" darkColor="#02afa8" style={styles.card}>
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.cardDescription}>{description}</ThemedText>
      {children}
    </ThemedView>
  );
}

function JourneyTile({
  option,
  isSelected,
  onPress,
}: {
  option: JourneyOption;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bodyAreaTile,
        isSelected && styles.bodyAreaTileSelected,
        pressed && styles.bodyAreaTilePressed,
      ]}>
      <Image source={option.source} contentFit="contain" style={styles.bodyAreaImage} />
    </Pressable>
  );
}

export default function TlaScreen() {
  const [painLevel, setPainLevel] = useState(0);
  const [painRuleWidth, setPainRuleWidth] = useState(0);
  const [isPainConfirmed, setIsPainConfirmed] = useState(false);
  const [selectedStepTwoOption, setSelectedStepTwoOption] = useState<string | null>(null);
  const [selectedStepThreeOption, setSelectedStepThreeOption] = useState<string | null>(null);
  const [selectedStepFourOption, setSelectedStepFourOption] = useState<string | null>(null);

  const activePainGuide =
    PAIN_GUIDES.find((guide) => painLevel <= guide.maxValue) ?? PAIN_GUIDES[PAIN_GUIDES.length - 1];
  const selectedStepTwoLabel =
    STEP_TWO_OPTIONS.find((option) => option.id === selectedStepTwoOption)?.label ?? null;
  const selectedStepThreeLabel =
    STEP_THREE_OPTIONS.find((option) => option.id === selectedStepThreeOption)?.label ?? null;
  const selectedStepFourLabel =
    STEP_FOUR_OPTIONS.find((option) => option.id === selectedStepFourOption)?.label ?? null;
  const painThumbLeft =
    painRuleWidth > 0
      ? Math.min(
          Math.max((painLevel / 10) * painRuleWidth - PAIN_THUMB_SIZE / 2, -PAIN_THUMB_SIZE / 2),
          painRuleWidth - PAIN_THUMB_SIZE / 2
        )
      : 0;

  const updatePainLevelFromPosition = (locationX: number) => {
    if (painRuleWidth <= 0) {
      return;
    }

    const boundedX = Math.min(Math.max(locationX, 0), painRuleWidth);
    const nextPainLevel = Math.round((boundedX / painRuleWidth) * 10);
    setPainLevel(nextPainLevel);
  };

  const handleConfirmPain = () => {
    setIsPainConfirmed(true);
    setSelectedStepTwoOption(null);
    setSelectedStepThreeOption(null);
    setSelectedStepFourOption(null);
  };

  const handleStepTwoSelect = (optionId: string) => {
    setSelectedStepTwoOption(optionId);
    setSelectedStepThreeOption(null);
    setSelectedStepFourOption(null);
  };

  const handleStepThreeSelect = (optionId: string) => {
    setSelectedStepThreeOption(optionId);
    setSelectedStepFourOption(null);
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
          Indique ton niveau de douleur en touchant la regle.
        </ThemedText>

        <SectionCard
          title="Etape 1"
          description="0 = aucune douleur, 10 = douleur maximale">
          <ThemedText style={styles.selectionText}>
            {painLevel} / 10 · {activePainGuide.caption}
          </ThemedText>

          <View style={styles.painScale}>
            <View style={styles.painNumberRow}>
              {PAIN_VALUES.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setPainLevel(value)}
                  style={styles.painNumberPressable}>
                  <ThemedText style={[styles.painNumber, value === painLevel && styles.painNumberActive]}>
                    {value}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View
              onLayout={(event) => setPainRuleWidth(event.nativeEvent.layout.width)}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => updatePainLevelFromPosition(event.nativeEvent.locationX)}
              onResponderMove={(event) => updatePainLevelFromPosition(event.nativeEvent.locationX)}
              onStartShouldSetResponder={() => true}
              style={styles.painRuleTouchArea}>
              <Image source={PAIN_RULE_IMAGE} contentFit="contain" style={styles.painRuleImage} />

              {painRuleWidth > 0 ? (
                <View pointerEvents="none" style={[styles.painThumb, { left: painThumbLeft }]}>
                  <Image source={activePainGuide.source} contentFit="contain" style={styles.painThumbImage} />
                </View>
              ) : null}
            </View>

            <View style={styles.painGuideRow}>
              {PAIN_GUIDES.map((guide) => (
                <View
                  key={guide.id}
                  style={[styles.painGuideCard, activePainGuide.id === guide.id && styles.painGuideCardActive]}>
                  <Image source={guide.source} contentFit="contain" style={styles.painGuideImage} />
                  <ThemedText style={styles.painGuideLabel}>{guide.label}</ThemedText>
                  <ThemedText style={styles.painGuideCaption}>{guide.caption}</ThemedText>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleConfirmPain}
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.confirmButtonPressed,
              ]}>
              <ThemedText style={styles.confirmButtonText}>Confirmer</ThemedText>
            </Pressable>
          </View>
        </SectionCard>

        {isPainConfirmed ? (
          <SectionCard
            title="Etape 2"
            description="Ou avez vous mal?">
            <View style={styles.optionRow}>
              {STEP_TWO_OPTIONS.map((option) => (
                <JourneyTile
                  key={option.id}
                  option={option}
                  isSelected={selectedStepTwoOption === option.id}
                  onPress={() => handleStepTwoSelect(option.id)}
                />
              ))}
            </View>
            {selectedStepTwoLabel ? (
              <ThemedText style={styles.choiceSummaryText}>
                Image choisie : {selectedStepTwoLabel}
              </ThemedText>
            ) : null}
          </SectionCard>
        ) : null}

        {selectedStepTwoOption ? (
          <SectionCard
            title="Etape 3"
            description="Depuis quand?">
            <View style={styles.optionRow}>
              {STEP_THREE_OPTIONS.map((option) => (
                <JourneyTile
                  key={option.id}
                  option={option}
                  isSelected={selectedStepThreeOption === option.id}
                  onPress={() => handleStepThreeSelect(option.id)}
                />
              ))}
            </View>
            {selectedStepThreeLabel ? (
              <ThemedText style={styles.choiceSummaryText}>
                Image choisie : {selectedStepThreeLabel}
              </ThemedText>
            ) : null}
          </SectionCard>
        ) : null}

        {selectedStepThreeOption ? (
          <SectionCard
            title="Etape 4"
            description="Quels symptomes?">
            <View style={styles.optionRow}>
              {STEP_FOUR_OPTIONS.map((option) => (
                <JourneyTile
                  key={option.id}
                  option={option}
                  isSelected={selectedStepFourOption === option.id}
                  onPress={() => setSelectedStepFourOption(option.id)}
                />
              ))}
            </View>
            {selectedStepFourLabel ? (
              <ThemedText style={styles.choiceSummaryText}>
                Image choisie : {selectedStepFourLabel}
              </ThemedText>
            ) : null}
          </SectionCard>
        ) : null}

        {selectedStepFourOption ? (
          <ThemedText style={styles.endText}>Fin du parcours</ThemedText>
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
    fontFamily: Fonts.extraBold,
    letterSpacing: 2,
    color: '#e3e013',
  },
  content: {
    gap: 18,
  },
  title: {
    textAlign: 'center',
    fontFamily: Fonts.extraBold,
  },
  description: {
    textAlign: 'center',
    opacity: 0.8,
  },
  card: {
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
  cardTitle: {
    textAlign: 'center',
    fontFamily: Fonts.bold,
  },
  cardDescription: {
    textAlign: 'center',
    opacity: 0.78,
  },
  selectionText: {
    textAlign: 'center',
    fontFamily: Fonts.bold,
    color: '#236B56',
  },
  painScale: {
    gap: 14,
  },
  painNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  painNumberPressable: {
    flex: 1,
    alignItems: 'center',
  },
  painNumber: {
    fontFamily: Fonts.bold,
    color: '#7C8F87',
  },
  painNumberActive: {
    color: '#174B3B',
  },
  painRuleTouchArea: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  painRuleImage: {
    width: '100%',
    height: 64,
  },
  painThumb: {
    position: 'absolute',
    top: 14,
    width: PAIN_THUMB_SIZE,
    height: PAIN_THUMB_SIZE,
  },
  painThumbImage: {
    width: '100%',
    height: '100%',
  },
  painGuideRow: {
    flexDirection: 'row',
    gap: 10,
  },
  painGuideCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#D6E6DC',
    backgroundColor: '#FFFFFF',
  },
  painGuideCardActive: {
    borderWidth: 4,
    borderColor: '#0b3e6b',
    backgroundColor: '#F1FAF6',
  },
  painGuideImage: {
    width: 38,
    height: 38,
  },
  painGuideLabel: {
    fontFamily: Fonts.bold,
    color: '#0b3e6b',
  },
  painGuideCaption: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.72,
    fontFamily: Fonts.regular,
    color: '#0b3e6b',
  },
  confirmButton: {
    marginTop: 2,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#236B56',
  },
  confirmButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bodyAreaTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D6E6DC',
    backgroundColor: '#FFFFFF',
  },
  bodyAreaTileSelected: {
    borderWidth: 4,
    borderColor: '#0b3e6b',
    backgroundColor: '#F1FAF6',
    shadowColor: '#0b3e6b',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  bodyAreaTilePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  bodyAreaImage: {
    width: '100%',
    height: 90,
  },
  endText: {
    textAlign: 'center',
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    backgroundColor: '#0b3e6b',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  choiceSummaryText: {
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    color: '#174B3B',
  },
});
