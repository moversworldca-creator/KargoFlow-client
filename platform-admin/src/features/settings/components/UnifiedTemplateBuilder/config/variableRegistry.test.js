import { describe, expect, it } from "vitest";
import {
  MERGE_VARIABLES,
  getVariablesForMode,
  normalizeBuilderVariableGroups,
  normalizeLegacyMergeFieldAliases,
} from "./variableRegistry";

describe("normalizeBuilderVariableGroups", () => {
  it("maps the backend's grouped variables response to sidebar merge tags", () => {
    expect(
      normalizeBuilderVariableGroups([
        {
          key: "customer",
          label: "Customer",
          variables: [
            { token: "customer.first_name", label: "First name" },
            { token: "customer.email", label: "Email" },
          ],
        },
        {
          key: "custom",
          label: "Custom",
          variables: [{ token: "custom.dot_number", label: "DOT number" }],
        },
      ])
    ).toEqual([
      {
        group: "Customer",
        items: [
          { label: "First name", tag: "{{customer.first_name}}" },
          { label: "Email", tag: "{{customer.email}}" },
        ],
      },
      {
        group: "Custom",
        items: [{ label: "DOT number", tag: "{{custom.dot_number}}" }],
      },
    ]);
  });

  describe("merge-field defaults", () => {
    it("offers the supported move-size field and omits its legacy invalid alias", () => {
      const tags = getVariablesForMode("contract").flatMap(({ items }) => items.map(({ tag }) => tag));

      expect(tags).toContain("{{move.size}}");
      expect(tags).toContain("{{move.estimated_weight}}");
    });

    it("offers move placeholders in document mode", () => {
      const tags = getVariablesForMode("document").flatMap(({ items }) => items.map(({ tag }) => tag));

      expect(tags).toContain("{{move.date}}");
      expect(tags).toContain("{{move.size}}");
      expect(tags).toContain("{{move.origin_address}}");
      expect(tags).toContain("{{move.destination_address}}");
    });

    it("normalizes address aliases without converting numeric weight into move size", () => {
      expect(normalizeLegacyMergeFieldAliases({
        fields: [{ value: "{{move.estimated_weight}}" }, { value: "{{move.pickup_address}}" }],
        html: "<p>{{ move.pickup_address | upper }}</p>",
        custom: "estimated_weight",
      })).toEqual({
        fields: [{ value: "{{move.estimated_weight}}" }, { value: "{{move.origin_address}}" }],
        html: "<p>{{move.origin_address | upper}}</p>",
        custom: "estimated_weight",
      });
    });

    it("uses the backend's canonical estimate financial tokens", () => {
      const estimateTags = MERGE_VARIABLES.estimate.map(({ tag }) => tag);

      expect(estimateTags).toContain("{{estimate.tax}}");
      expect(estimateTags).toContain("{{estimate.deposit_amount}}");
      expect(estimateTags).toContain("{{links.estimate_portal}}");
      expect(estimateTags).not.toContain("{{estimate.tax_amount}}");
      expect(estimateTags).not.toContain("{{estimate.deposit_due}}");
      expect(estimateTags).not.toContain("{{estimate.portal_url}}");
    });

    it("offers only the backend-supported portal link in estimate editor suggestions", () => {
      const tags = getVariablesForMode("estimate").flatMap(({ items }) => items.map(({ tag }) => tag));

      expect(tags).toContain("{{links.estimate_portal}}");
      expect(tags).not.toContain("{{estimate.portal_url}}");
    });

    it("offers only backend-supported document and invoice fallback fields", () => {
      const documentTags = getVariablesForMode("contract").flatMap(({ items }) => items.map(({ tag }) => tag));
      const invoiceTags = getVariablesForMode("invoice").flatMap(({ items }) => items.map(({ tag }) => tag));

      for (const token of [
        "{{customer.company}}",
        "{{move.delivery_city_state}}",
        "{{move.delivery_date}}",
        "{{estimate.issue_date}}",
        "{{estimate.expiry_date}}",
        "{{company.mc_number}}",
      ]) {
        expect(documentTags).not.toContain(token);
      }
      expect(documentTags).toContain("{{move.date}}");
      expect(documentTags).toContain("{{opportunity.service_type}}");
      expect(documentTags).not.toContain("{{company.dot_number}}");
      expect(invoiceTags).toContain("{{invoice.issued_at}}");
      expect(invoiceTags).toContain("{{invoice.due_at}}");
      expect(invoiceTags).toContain("{{links.pay_now}}");
      expect(invoiceTags).not.toContain("{{invoice.issue_date}}");
      expect(invoiceTags).not.toContain("{{invoice.due_date}}");
      expect(invoiceTags).not.toContain("{{invoice.payment_url}}");
    });

    it("normalizes legacy fields only when a supported equivalent exists", () => {
      expect(normalizeLegacyMergeFieldAliases(
        "{{move.pickup_date}} {{move.delivery_address}} {{move.service_type}} {{invoice.payment_url}}"
      )).toBe("{{move.date}} {{move.destination_address}} {{opportunity.service_type}} {{links.pay_now}}");
      expect(normalizeLegacyMergeFieldAliases(
        "{{customer.company}} {{move.delivery_date}} {{estimate.expiry_date}} {{company.mc_number}}"
      )).toBe("{{customer.company}} {{move.delivery_date}} {{estimate.expiry_date}} {{company.mc_number}}");
    });

    it("does not offer unsupported pickup address merge fields", () => {
      const tags = getVariablesForMode("estimate").flatMap(({ items }) => items.map(({ tag }) => tag));

      expect(tags).toContain("{{move.origin_address}}");
      expect(tags).not.toContain("{{move.pickup_address}}");
      expect(tags).not.toContain("{{move.pickup_city_state}}");
    });
  });

  it("accepts a token already wrapped as a merge tag and ignores invalid entries", () => {
    expect(
      normalizeBuilderVariableGroups([
        {
          key: "general",
          label: "General",
          variables: [
            { token: "{{company.name}}", label: "Company name" },
            { label: "Missing token" },
          ],
        },
      ])
    ).toEqual([
      { group: "General", items: [{ label: "Company name", tag: "{{company.name}}" }] },
    ]);
  });
});
