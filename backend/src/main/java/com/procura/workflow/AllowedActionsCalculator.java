package com.procura.workflow;

import com.procura.common.enums.AllowedAction;
import com.procura.common.enums.RequestStatus;
import com.procura.common.enums.Role;
import com.procura.procurement.PurchaseRequest;
import com.procura.security.UserPrincipal;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class AllowedActionsCalculator {

    public List<AllowedAction> calculateAllowedActions(PurchaseRequest request, UserPrincipal user) {
        if (user == null || request == null) {
            return Collections.emptyList();
        }

        List<AllowedAction> actions = new ArrayList<>();
        boolean isOwner = user.getId().equals(request.getRequester().getId());
        Role role = user.getRole();
        Long deptId = user.getDepartmentId();

        switch (request.getStatus()) {
            case DRAFT:
                if (isOwner) {
                    actions.add(AllowedAction.EDIT);
                    actions.add(AllowedAction.DELETE);
                    actions.add(AllowedAction.SUBMIT);
                }
                break;

            case INFO_REQUESTED:
                if (isOwner) {
                    actions.add(AllowedAction.EDIT);
                    actions.add(AllowedAction.SUBMIT);
                }
                break;

            case SUBMITTED:
                // Rule: user cannot act on their own request at any approval step
                if (!isOwner && role == Role.DEPARTMENT_HEAD && deptId != null && deptId.equals(request.getDepartment().getId())) {
                    actions.add(AllowedAction.APPROVE);
                    actions.add(AllowedAction.REJECT);
                    actions.add(AllowedAction.REQUEST_INFORMATION);
                }
                break;

            case DEPARTMENT_APPROVED:
                if (!isOwner && role == Role.FINANCE_MANAGER) {
                    actions.add(AllowedAction.APPROVE);
                    actions.add(AllowedAction.REJECT);
                }
                break;

            case HUMAN_REVIEW:
                if (!isOwner && role == Role.FINANCE_MANAGER) {
                    actions.add(AllowedAction.REVIEW);
                }
                break;

            case FINANCE_APPROVED:
                if (role == Role.FINANCE_MANAGER && request.getPurchaseOrderId() == null) {
                    actions.add(AllowedAction.RETRY_PO);
                }
                break;

            case PO_GENERATED:
            case REJECTED:
            default:
                break;
        }

        return actions;
    }
}

