package com.tailorstudio.app.web;

import com.tailorstudio.app.domain.GarmentType;
import com.tailorstudio.app.dto.MeasurementFieldDef;
import com.tailorstudio.app.measurement.MeasurementTemplates;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/measurement-templates")
public class MeasurementTemplateController {

    @GetMapping
    public Map<GarmentType, List<MeasurementFieldDef>> all() {
        return MeasurementTemplates.all();
    }

    @GetMapping("/{garment}")
    public List<MeasurementFieldDef> forGarment(@PathVariable GarmentType garment) {
        return MeasurementTemplates.fieldsFor(garment);
    }
}
