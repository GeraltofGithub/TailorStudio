package com.tailorstudio.app.measurement;

import com.tailorstudio.app.domain.GarmentType;
import com.tailorstudio.app.dto.MeasurementFieldDef;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Industry-style measurement sets (shirt / trouser / blouse / suit) with grouping.
 * Values are stored as numbers in the customer's preferred unit (inch or cm).
 */
public final class MeasurementTemplates {

    private static final Map<GarmentType, List<MeasurementFieldDef>> BY_TYPE = new EnumMap<>(GarmentType.class);

    static {
        BY_TYPE.put(
                GarmentType.SHIRT,
                List.of(
                        field("collar", "Collar / neck", "Neck & shoulders", "Around base of neck, snug + 1 finger room"),
                        field("shoulder", "Shoulder width", "Neck & shoulders", "Shoulder point to shoulder point across back"),
                        field("chest", "Chest", "Upper body", "Fullest part of chest, tape level"),
                        field("stomach", "Stomach", "Upper body", "Around stomach at fullest point (optional)"),
                        field("waist", "Waist", "Upper body", "Narrowest part of torso"),
                        field("seat", "Seat / hip (shirt)", "Upper body", "Fullest seat for shirt drape"),
                        field("shirtLength", "Shirt length", "Length", "High shoulder point to desired hem"),
                        field("sleeveLength", "Sleeve length", "Sleeves", "Center back neck over shoulder to wrist bone"),
                        field("bicep", "Bicep", "Sleeves", "Around fullest part of upper arm"),
                        field("cuff", "Cuff", "Sleeves", "Around wrist for cuff finish"),
                        field("wrist", "Wrist", "Advanced measurements (optional)", "Keep both wrist and cuff if you need both"),
                        field("forearm", "Forearm", "Advanced measurements (optional)", "Around fullest forearm (optional)")));

        BY_TYPE.put(
                GarmentType.PANT,
                List.of(
                        field("pantStyle", "Pant style", "Pant style (optional)", "Trouser / Churidar / Salwar / Dhoti / Aligarhi"),
                        field("pantFit", "Fit type", "Pant style (optional)", "Slim fit / Regular fit / Bootcut / Bell bottom"),
                        field("pantPleats", "Pleats", "Pant style (optional)", "Flat front / Single pleat / Double pleat"),
                        field("waist", "Waist", "Waist & seat", "Where band sits; keep tape snug"),
                        field("hip", "Hip / seat", "Waist & seat", "Fullest part of seat"),
                        field("thigh", "Thigh", "Leg", "Around fullest part of thigh"),
                        field("knee", "Knee", "Leg", "Around knee with slight bend"),
                        field("ankle", "Ankle / bottom", "Leg", "Desired hem opening"),
                        field("inseam", "Inseam", "Length", "Crotch seam along inside leg to hem"),
                        field("outseam", "Outseam / side length", "Length", "Waist side to hem along outside leg"),
                        field("rise", "Rise (front)", "Rise", "Waist to crotch at front"),
                        field("crotch", "Crotch depth", "Rise", "Comfort depth for seat"),
                        field("stomach", "Stomach", "Advanced measurements (optional)", "Around stomach at fullest point (optional)")));

        BY_TYPE.put(
                GarmentType.BLOUSE,
                List.of(
                        field("bust", "Bust", "Upper body", "Fullest part, tape level"),
                        field("underBust", "Under bust", "Upper body", "Directly under bust line"),
                        field("waist", "Waist", "Upper body", "Narrowest part"),
                        field("hip", "Hip", "Upper body", "Fullest part of hip"),
                        field("shoulder", "Shoulder", "Neck & armhole", "Shoulder point to point"),
                        field("armhole", "Armhole depth", "Neck & armhole", "Vertical at side from shoulder"),
                        field("sleeveLength", "Sleeve length", "Sleeves", "Shoulder point to wrist"),
                        field("sleeveOpen", "Sleeve opening", "Sleeves", "Around wrist or desired opening"),
                        field("blouseLength", "Blouse length", "Length", "Shoulder to desired hem"),
                        field("neck", "Neck / back neck width", "Neck & armhole", "Across back neck if needed")));

        BY_TYPE.put(
                GarmentType.SUIT,
                List.of(
                        field("jacketChest", "Jacket chest", "Jacket", "Fullest chest in jacket posture"),
                        field("jacketWaist", "Jacket waist", "Jacket", "At jacket waist suppression"),
                        field("jacketShoulder", "Jacket shoulder", "Jacket", "Shoulder point to point"),
                        field("jacketSleeve", "Jacket sleeve", "Jacket", "Shoulder to wrist over arm"),
                        field("jacketLength", "Jacket length", "Jacket", "High shoulder to jacket hem"),
                        field("waistcoat", "Waistcoat (yes/no)", "Jacket", "Optional: write Yes if needed"),
                        field("trouserWaist", "Trouser waist", "Trouser", "Where trouser band sits"),
                        field("trouserHip", "Trouser hip", "Trouser", "Fullest seat"),
                        field("trouserInseam", "Trouser inseam", "Trouser", "Inside leg length"),
                        field("trouserOutseam", "Trouser outseam", "Trouser", "Side length waist to hem"),
                        field("trouserBottom", "Trouser hem / bottom", "Trouser", "Finished leg opening")));

        // Ethnic / traditional wear
        List<MeasurementFieldDef> ethnicBase = List.of(
                field("collar", "Collar / neck", "Neck & shoulders", "Around base of neck, snug + 1 finger room"),
                field("shoulder", "Shoulder width", "Neck & shoulders", "Shoulder point to shoulder point across back"),
                field("chest", "Chest", "Upper body", "Fullest part of chest, tape level"),
                field("stomach", "Stomach", "Upper body", "Around stomach at fullest point (optional)"),
                field("waist", "Waist", "Upper body", "Narrowest part of torso"),
                field("hip", "Hip / seat", "Upper body", "Fullest hip/seat"),
                field("sleeveLength", "Sleeve length", "Sleeves", "Center back neck over shoulder to wrist bone"),
                field("bicep", "Bicep", "Sleeves", "Around fullest part of upper arm"),
                field("wrist", "Wrist", "Sleeves", "Around wrist (optional)"),
                field("length", "Length", "Length", "High shoulder point to desired hem"));

        BY_TYPE.put(GarmentType.KURTA, ethnicBase);
        BY_TYPE.put(GarmentType.SHERWANI, ethnicBase);
        BY_TYPE.put(GarmentType.INDO_WESTERN, ethnicBase);
        BY_TYPE.put(GarmentType.NEHRU_JACKET, ethnicBase);
        BY_TYPE.put(GarmentType.WAISTCOAT, ethnicBase);
        BY_TYPE.put(GarmentType.JODHPURI, ethnicBase);

        // Accessories / details (customer-only)
        BY_TYPE.put(
                GarmentType.ACCESSORIES,
                List.of(
                        field("pocketSquare", "Pocket square", "Accessories (optional)", "Yes / No"),
                        field("tie", "Tie", "Accessories (optional)", "Yes / No"),
                        field("bow", "Bow", "Accessories (optional)", "Yes / No"),
                        field("cufflinks", "Cufflinks", "Accessories (optional)", "Yes / No"),
                        field("collarPin", "Collar pin", "Accessories (optional)", "Yes / No"),
                        field("stoleShawl", "Stole / shawl", "Accessories (optional)", "Yes / No"),
                        field("safaSize", "Safa size", "Accessories (optional)", "Write size if needed"),
                        field("shoeSize", "Shoe size", "Accessories (optional)", "Write size if needed")));
    }

    private static MeasurementFieldDef field(String key, String label, String group, String hint) {
        return new MeasurementFieldDef(key, label, group, hint);
    }

    public static List<MeasurementFieldDef> fieldsFor(GarmentType type) {
        return BY_TYPE.getOrDefault(type, List.of());
    }

    public static Map<GarmentType, List<MeasurementFieldDef>> all() {
        return Map.copyOf(BY_TYPE);
    }

    private MeasurementTemplates() {}
}
